import { logger } from "../config/logger.js";
import { delay } from "../utils/delay.js";
import createIfNotExists from "../utils/saveToMongo.js";

// Function to scrape data from a given URL and handle pagination if found
export const getPdf = async (url, page, urlQueue, visitedPdfUrls, allPdf) => {
  try {
    console.log("scraping from: ", url);

    // Go to the URL
    await page.goto(url, { waitUntil: "networkidle2" });

    try {
      // Check if the input and submit button exist
      const inputElement = await page.$(
        "#ContentPlaceHolder1_OfficerIPRDetails1_txtKeyword"
      );
      const submitButton = await page.$(
        "#ContentPlaceHolder1_OfficerIPRDetails1_btnSearch"
      );

      if (inputElement && submitButton) {
        // Clear the input field
        await page.evaluate((input) => {
          input.value = ""; // Set input value to empty
        }, inputElement);

        // Click the submit button to submit the form
        await submitButton.click();

        console.log("Form submitted after clearing the input field.");
      } else {
        console.log("Input element or submit button not found.");
      }
    } catch (error) {
      console.error("Error during form handling:", error);
    }

    // do scrapping for of the page
    try {
      // Wait for <a> tags on page
      // try {
      //   await page.waitForSelector("a", { timeout: 15000 });
      // } catch (error) {
      //   // Element not found within the timeout, skip without throwing error
      //   console.log("Element not found, skipping...", error.message);
      //   return;
      // }

      await delay(3000);

      // await delay(10000);
      // Get all the <a> elements
      const allAnchorData = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));

        return anchors.map((anchor) => {
          let title = null;

          // Check if the URL starts with the specified base URL and ends with .pdf
          if (
            window.location.href.startsWith(
              "https://www.mea.gov.in/ipr-of-ifs-officers.htm"
            ) &&
            anchor.href.toLowerCase().endsWith(".pdf")
          ) {
            // Get the title from its parent <p> tag's sibling <h3> element
            const parentElem = anchor.closest("p");
            if (parentElem) {
              const h3Elem = parentElem.parentElement.querySelector("h3");
              if (h3Elem) {
                title = h3Elem.innerText.trim(); // Get the title from the <h3> tag
              }
            }
          }

          // Return an object with the anchor's href, innerText, and title
          return {
            href: anchor.href,
            innerText: anchor.innerText.trim() || null,
            title: title || null, // Use the title if available, otherwise null
          };
        });
      });

      // Loop through each <a> element
      for (const anchorData of allAnchorData) {
        let { href, title, innerText } = anchorData;

        // console.log(anchorData);
        logger.info({
          anchorData: anchorData,
        });
        if (href.toLowerCase().endsWith(".pdf") && !visitedPdfUrls.has(href)) {
          visitedPdfUrls.add(href);

          // Remove unwanted patterns
          function removePatterns(input) {
            // Define the patterns to remove with word boundaries
            const patterns = [
              /\bview pdf\b/i,
              /\bview link\b/i,
              /\bview\b/i,
              /\bshare link\b/i,
              /\bpdf link\b/i,
              /\blink\b/i,
              /\bshare\b/i,
              /\Read More about\b/i,
              /\Read More\b/i,
              /\Read\b/i,
              /\bClick here for\b/i,
              /\bclick here to view\b/i,
              /\bclick here to\b/i,
              /\bclick here\b/i,
              /\bclick to download\b/i,
              /\bclick to\b/i,
              /\bclick\b/i,
              /\bdownload\b/i,
              /\bdownload pdf\b/i,
              /\(\d+\s?(kb|mb)\)/gi, // Matches patterns like "(20kb)", "(30 mb)"
              /\d+\s?(kb|mb)/gi, // Matches patterns like "270 kb", "23mb"
              /\d+\.\s/g, // Matches numbered lists like "1.", "2."
              /\.pdf\b/i, // Matches ".pdf" file extension
              /\(PDF\s*\d*\.\)/i, // Matches "(PDF 2.)" or "(PDF .)"
              /\(PDF\s*\)/i, // Matches "(PDF )"
              /\bpdf\b/i,
            ];

            // Combine the patterns into a single regular expression
            const combinedPattern = new RegExp(
              patterns.map((pattern) => pattern.source).join("|"),
              "gi"
            );

            // Remove unwanted special characters except for (){}[],.-_
            // const unwantedCharsPattern = /[^a-zA-Z0-9 (){}[\],.-_&]/g;
            const removeSpecificCharsPattern = /[<>^#@`~*+=;:]/g;

            // Clean the input
            let cleanedInput = input
              .replace(combinedPattern, "")
              .replace(removeSpecificCharsPattern, "")
              .trim(); // Ensure cleaned text is trimmed

            // Remove extra spaces (double spaces or more)
            cleanedInput = cleanedInput.replace(/\s{2,}/g, " ");

            return cleanedInput; // Return the final cleaned input
          }

          // Function to remove specific unwanted special characters from the start and end of a string
          function removeLeadingAndTrailingSpecialChars(input) {
            // Define a regex that matches unwanted special characters or spaces at the start and end of the string
            const unwantedCharsPattern =
              /^[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+|[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+$/gu; // List of unwanted special characters + spaces

            // Remove unwanted characters from the start and end, and then trim the string
            return input.replace(unwantedCharsPattern, "").trim();
          }

          if (title) {
            title = removePatterns(title);
            title = removeLeadingAndTrailingSpecialChars(title);
          }
          if (innerText) {
            innerText = removePatterns(innerText);
            innerText = removeLeadingAndTrailingSpecialChars(innerText);
          }

          logger.info({
            href: href,
            title: title,
            innerText: innerText,
            pageUrl: url,
          });

          if (
            url.startsWith("https://www.mea.gov.in/ipr-of-ifs-officers.htm")
          ) {
            title = title;
          } else if (
            ((title && title.trim().length < 4) || !title) &&
            innerText &&
            innerText.trim().length > 3
          ) {
            title = innerText;
          } else if (
            ((innerText && innerText.trim().length < 4) || !innerText) &&
            title &&
            title.trim().length > 3
          ) {
            title = title;
          } else if (title && innerText) {
            title = title.length >= innerText.length ? title : innerText;
          } else if (!title || title.length < 4) {
            logger.info({
              SkippingDocument: href,
              title: title,
              innerText: innerText,
            });
            continue;
          } else {
            console.log("title skipping all edge case", title, innerText);
          }

          if (!title || title.length < 4) {
            logger.info({
              SkippingDocument: href,
              title: title,
              innerText: innerText,
            });
            continue;
          }

          let tagString = await page.evaluate(() => {
            try {
              const breadCrumb = document.querySelector("ul.breadcrumb");
              let breadcrumbItems = [];
              if (breadCrumb) {
                breadcrumbItems = breadCrumb.innerText
                  .split("›")
                  .map((item) => item.trim())
                  .filter(
                    (text) => !/(home|హోమ్|home page|Home|होम)/i.test(text)
                  );
              }

              if (breadCrumb && breadcrumbItems.length > 0) {
                return (
                  "Ministry of External Affairs" +
                  " <-> " +
                  breadcrumbItems
                    .join(" <-> ")
                    .replace(/(<-> )+/g, " <-> ")
                    .trim()
                );
              } else {
                return "Ministry of External Affairs";
              }
            } catch (error) {
              console.error("Error extracting breadcrumb:", error);
            }
            return "Ministry of External Affairs";
          });

          function cleanTagString(str) {
            // Step 1: Remove '<->' from the beginning and end if present
            if (str.startsWith("<->")) {
              str = str.slice(3); // Remove the first 3 characters
            }
            if (str.endsWith("<->")) {
              str = str.slice(0, -3); // Remove the last 3 characters
            }

            // Step 2: Remove extra spaces (leading, trailing, and multiple spaces between words)
            str = str.replace(/\s+/g, " ").trim(); // This replaces multiple spaces with a single space and trims the string.

            return str;
          }

          // remove extra spaces and joinner
          tagString = tagString.replace(/\s+/g, " ").trim();
          tagString = cleanTagString(tagString);

          // console.log("tagString- ", tagString);
          const pdfLink = {
            tagString,
            title,
            pdfUrls: href,
          };

          createIfNotExists(pdfLink);
          allPdf.push(pdfLink);
        } else if (
          href.startsWith("https://www.mea.gov.in/") &&
          !visitedPdfUrls.has(href) && // Avoid visiting the same URL
          !href.toLowerCase().endsWith(".xlsx") &&
          !href.toLowerCase().endsWith(".doc") &&
          !href.toLowerCase().endsWith(".docx") &&
          !href.toLowerCase().endsWith(".xls") &&
          !href.toLowerCase().endsWith(".xlsb") &&
          !href.toLowerCase().endsWith(".xlsm") &&
          !href.toLowerCase().endsWith(".zip") &&
          !href.toLowerCase().endsWith(".mp4") &&
          !href.toLowerCase().endsWith(".png") &&
          !href.toLowerCase().endsWith(".jpg") &&
          !href.toLowerCase().endsWith(".jpeg") &&
          !href.toLowerCase().endsWith(".webp") &&
          !href.toLowerCase().endsWith(".webm") &&
          !href.toLowerCase().endsWith(".epub") &&
          !href.toLowerCase().endsWith(".mp3") &&
          !href.toLowerCase().includes("index.php") &&
          !href.toLowerCase().includes("index.html") &&
          !href.toLowerCase().includes("/hi") &&
          !href.toLowerCase().includes("#")
        ) {
          // console.log(`Pushing URL to queue: ${href}`);
          urlQueue.add(href);
        }
      }
    } catch (error) {
      console.log("Error during PDF extraction:", error);
    }

    // Find the <div> element with class "pagingNo" and the "Next" button
    const paginationResult = await page.evaluate(() => {
      const paginationDiv = document.querySelector(".pagingNo");

      if (paginationDiv) {
        const nextButton = paginationDiv.querySelector('input[value="Next"]');
        if (nextButton) {
          // Check if "Next" button is disabled
          const isNextButtonDisabled =
            nextButton.getAttribute("disabled") === "disabled";
          return {
            nextButtonSelector: 'input[value="Next"]',
            isNextButtonDisabled,
          };
        }
      }
      return null;
    });

    if (paginationResult) {
      const { nextButtonSelector, isNextButtonDisabled } = paginationResult;

      // Click the "Next" button until it is disabled (indicating the last page)
      let isButtonDisabled = isNextButtonDisabled;
      while (!isButtonDisabled) {
        // Click the "Next" button by its selector inside the browser context
        await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button && !button.disabled) {
            button.click();
          }
        }, nextButtonSelector); // Pass the selector to evaluate function

        // do scrapping if pagination found
        try {
          // Wait for <a> tags on page
          // try {
          //   await page.waitForSelector("a", { timeout: 5000 });
          // } catch (error) {
          //   // Element not found within the timeout, skip without throwing error
          //   console.log("Element not found, skipping...", error.message);
          //   return;
          // }

          await delay(3000);

          // Get all the <a> elements
          const allAnchorData = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll("a"));

            return anchors.map((anchor) => {
              let title = null;

              // Check if the URL starts with the specified base URL and ends with .pdf
              if (
                window.location.href.startsWith(
                  "https://www.mea.gov.in/ipr-of-ifs-officers.htm"
                ) &&
                anchor.href.toLowerCase().endsWith(".pdf")
              ) {
                // Get the title from its parent <p> tag's sibling <h3> element
                const parentElem = anchor.closest("p");
                if (parentElem) {
                  const h3Elem = parentElem.parentElement.querySelector("h3");
                  if (h3Elem) {
                    title = h3Elem.innerText.trim(); // Get the title from the <h3> tag
                  }
                }
              }

              // Return an object with the anchor's href, innerText, and title
              return {
                href: anchor.href,
                innerText: anchor.innerText.trim() || null,
                title: title || null, // Use the title if available, otherwise null
              };
            });
          });

          // Loop through each <a> element
          for (const anchorData of allAnchorData) {
            let { href, title, innerText } = anchorData;

            // console.log(anchorData);
            logger.info({
              anchorData: anchorData,
            });
            if (
              href.toLowerCase().endsWith(".pdf") &&
              !visitedPdfUrls.has(href)
            ) {
              visitedPdfUrls.add(href);

              // Remove unwanted patterns
              function removePatterns(input) {
                // Define the patterns to remove with word boundaries
                const patterns = [
                  /\bview pdf\b/i,
                  /\bview link\b/i,
                  /\bview\b/i,
                  /\bshare link\b/i,
                  /\bpdf link\b/i,
                  /\blink\b/i,
                  /\bshare\b/i,
                  /\Read More about\b/i,
                  /\Read More\b/i,
                  /\Read\b/i,
                  /\bClick here for\b/i,
                  /\bclick here to view\b/i,
                  /\bclick here to\b/i,
                  /\bclick here\b/i,
                  /\bclick to download\b/i,
                  /\bclick to\b/i,
                  /\bclick\b/i,
                  /\bdownload\b/i,
                  /\bdownload pdf\b/i,
                  /\(\d+\s?(kb|mb)\)/gi, // Matches patterns like "(20kb)", "(30 mb)"
                  /\d+\s?(kb|mb)/gi, // Matches patterns like "270 kb", "23mb"
                  /\d+\.\s/g, // Matches numbered lists like "1.", "2."
                  /\.pdf\b/i, // Matches ".pdf" file extension
                  /\(PDF\s*\d*\.\)/i, // Matches "(PDF 2.)" or "(PDF .)"
                  /\(PDF\s*\)/i, // Matches "(PDF )"
                  /\bpdf\b/i,
                ];

                // Combine the patterns into a single regular expression
                const combinedPattern = new RegExp(
                  patterns.map((pattern) => pattern.source).join("|"),
                  "gi"
                );

                // Remove unwanted special characters except for (){}[],.-_
                // const unwantedCharsPattern = /[^a-zA-Z0-9 (){}[\],.-_&]/g;
                const removeSpecificCharsPattern = /[<>^#@`~*+=;:]/g;

                // Clean the input
                let cleanedInput = input
                  .replace(combinedPattern, "")
                  .replace(removeSpecificCharsPattern, "")
                  .trim(); // Ensure cleaned text is trimmed

                // Remove extra spaces (double spaces or more)
                cleanedInput = cleanedInput.replace(/\s{2,}/g, " ");

                return cleanedInput; // Return the final cleaned input
              }

              // Function to remove specific unwanted special characters from the start and end of a string
              function removeLeadingAndTrailingSpecialChars(input) {
                // Define a regex that matches unwanted special characters or spaces at the start and end of the string
                const unwantedCharsPattern =
                  /^[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+|[-!"#$%&'()*+,/:;<=>?@[\\\]_^`{|}~\s]+$/gu; // List of unwanted special characters + spaces

                // Remove unwanted characters from the start and end, and then trim the string
                return input.replace(unwantedCharsPattern, "").trim();
              }

              if (title) {
                title = removePatterns(title);
                title = removeLeadingAndTrailingSpecialChars(title);
              }
              if (innerText) {
                innerText = removePatterns(innerText);
                innerText = removeLeadingAndTrailingSpecialChars(innerText);
              }

              logger.info({
                href: href,
                title: title,
                innerText: innerText,
                pageUrl: url,
              });

              if (
                url.startsWith("https://www.mea.gov.in/ipr-of-ifs-officers.htm")
              ) {
                title = title;
              } else if (
                ((title && title.trim().length < 4) || !title) &&
                innerText &&
                innerText.trim().length > 3
              ) {
                title = innerText;
              } else if (
                ((innerText && innerText.trim().length < 4) || !innerText) &&
                title &&
                title.trim().length > 3
              ) {
                title = title;
              } else if (title && innerText) {
                title = title.length >= innerText.length ? title : innerText;
              } else if (!title || title.length < 4) {
                logger.info({
                  SkippingDocument: href,
                  title: title,
                  innerText: innerText,
                });
                continue;
              } else {
                console.log("title skipping all edge case", title, innerText);
              }

              if (!title || title.length < 4) {
                logger.info({
                  SkippingDocument: href,
                  title: title,
                  innerText: innerText,
                });
                continue;
              }

              let tagString = await page.evaluate(() => {
                try {
                  const breadCrumb = document.querySelector("ul.breadcrumb");
                  let breadcrumbItems = [];
                  if (breadCrumb) {
                    breadcrumbItems = breadCrumb.innerText
                      .split("›")
                      .map((item) => item.trim())
                      .filter(
                        (text) => !/(home|హోమ్|home page|Home|होम)/i.test(text)
                      );
                  }

                  if (breadCrumb && breadcrumbItems.length > 0) {
                    return (
                      "Ministry of External Affairs" +
                      " <-> " +
                      breadcrumbItems
                        .join(" <-> ")
                        .replace(/(<-> )+/g, " <-> ")
                        .trim()
                    );
                  } else {
                    return "Ministry of External Affairs";
                  }
                } catch (error) {
                  console.error("Error extracting breadcrumb:", error);
                }
                return "Ministry of External Affairs";
              });

              function cleanTagString(str) {
                // Step 1: Remove '<->' from the beginning and end if present
                if (str.startsWith("<->")) {
                  str = str.slice(3); // Remove the first 3 characters
                }
                if (str.endsWith("<->")) {
                  str = str.slice(0, -3); // Remove the last 3 characters
                }

                // Step 2: Remove extra spaces (leading, trailing, and multiple spaces between words)
                str = str.replace(/\s+/g, " ").trim(); // This replaces multiple spaces with a single space and trims the string.

                return str;
              }

              // remove extra spaces and joinner
              tagString = tagString.replace(/\s+/g, " ").trim();
              tagString = cleanTagString(tagString);

              // console.log("tagString- ", tagString);
              const pdfLink = {
                tagString,
                title,
                pdfUrls: href,
              };

              createIfNotExists(pdfLink);
              allPdf.push(pdfLink);
            } else if (
              href.startsWith("https://www.mea.gov.in/") &&
              !visitedPdfUrls.has(href) && // Avoid visiting the same URL
              !href.toLowerCase().endsWith(".xlsx") &&
              !href.toLowerCase().endsWith(".doc") &&
              !href.toLowerCase().endsWith(".docx") &&
              !href.toLowerCase().endsWith(".xls") &&
              !href.toLowerCase().endsWith(".xlsb") &&
              !href.toLowerCase().endsWith(".xlsm") &&
              !href.toLowerCase().endsWith(".zip") &&
              !href.toLowerCase().endsWith(".mp4") &&
              !href.toLowerCase().endsWith(".png") &&
              !href.toLowerCase().endsWith(".jpg") &&
              !href.toLowerCase().endsWith(".jpeg") &&
              !href.toLowerCase().endsWith(".webp") &&
              !href.toLowerCase().endsWith(".webm") &&
              !href.toLowerCase().endsWith(".epub") &&
              !href.toLowerCase().endsWith(".mp3") &&
              !href.toLowerCase().includes("index.php") &&
              !href.toLowerCase().includes("index.html") &&
              !href.toLowerCase().includes("/hi") &&
              !href.toLowerCase().includes("#")
            ) {
              // console.log(`Pushing URL to queue: ${href}`);
              urlQueue.add(href);
            }
          }
        } catch (error) {
          console.log("Error during PDF extraction:", error);
        }

        // Check if the "Next" button is disabled again
        isButtonDisabled = await page.evaluate((selector) => {
          const nextButton = document.querySelector(selector);
          return (
            nextButton && nextButton.getAttribute("disabled") === "disabled"
          );
        }, nextButtonSelector);
      }

      console.log("Reached the last page.");
    } else {
      console.log("'Next' button not found or pagination element is missing.");
    }
  } catch (error) {
    console.error("Error during PDF extraction:", error);
  }
};
