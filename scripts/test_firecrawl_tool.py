import unittest
from unittest.mock import Mock, patch

import requests

from firecrawl_tool import FirecrawlClient, FirecrawlError


class FirecrawlClientTest(unittest.TestCase):
    @patch("firecrawl_tool.requests.request")
    def test_scrape_uses_v2_markdown_endpoint(self, request: Mock) -> None:
        response = Mock()
        response.json.return_value = {"success": True, "data": {"markdown": "# Example"}}
        response.raise_for_status.return_value = None
        request.return_value = response

        result = FirecrawlClient(api_key="fc-test").scrape("https://example.com")

        self.assertEqual(result["data"]["markdown"], "# Example")
        request.assert_called_once_with(
            "POST",
            "https://api.firecrawl.dev/v2/scrape",
            headers={
                "Authorization": "Bearer fc-test",
                "Content-Type": "application/json",
            },
            json={"url": "https://example.com", "formats": ["markdown"]},
            timeout=60,
        )

    @patch("firecrawl_tool.requests.request")
    def test_api_errors_do_not_expose_the_key(self, request: Mock) -> None:
        response = Mock()
        response.json.return_value = {"error": "invalid key"}
        response.raise_for_status.side_effect = requests.HTTPError(response=response)
        request.return_value = response

        with self.assertRaisesRegex(FirecrawlError, "invalid key") as raised:
            FirecrawlClient(api_key="fc-secret-value").credit_usage()

        self.assertNotIn("fc-secret-value", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
