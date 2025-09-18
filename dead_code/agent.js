import { axios } from "@pipedream/platform"

export default defineComponent({
  name: "Fetch HTML and Respond",
  description: "Fetch HTML content from a URL and return it as a JSON response through webhook",
  type: "action",
  props: {
    url: {
      type: "string",
      label: "URL",
      description: "The URL to fetch HTML content from"
    }
  },
  async run({ $ }) {
    try {
      // Fetch HTML content
      const htmlContent = await axios($, {
        url: this.url,
        method: "GET"
      });

      const response = {
        success: true,
        url: this.url,
        content: htmlContent,
        timestamp: new Date().toISOString()
      };

      // Respond with JSON if $.respond is available (webhook context)
      if ($.respond) {
        await $.respond({
          status: 200,
          headers: {
            "Content-Type": "application/json"
          },
          body: response
        });
      }

      $.export("$summary", `Successfully fetched HTML content from ${this.url}`);
      
      return response;
    } catch (error) {
      const errorResponse = {
        success: false,
        url: this.url,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      // Respond with error if $.respond is available (webhook context)
      if ($.respond) {
        await $.respond({
          status: 500,
          headers: {
            "Content-Type": "application/json"
          },
          body: errorResponse
        });
      }

      $.export("$summary", `Failed to fetch HTML content from ${this.url}: ${error.message}`);
      
      return errorResponse;
    }
  }
})