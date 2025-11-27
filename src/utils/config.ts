/**
 * Configuration loader for the Cloudflare DNS MCP Server
 */

export interface Config {
  apiToken: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!apiToken) {
    throw new ConfigurationError(
      "CLOUDFLARE_API_TOKEN environment variable is required.\n\n" +
        "To create an API token:\n" +
        "1. Go to https://dash.cloudflare.com/profile/api-tokens\n" +
        "2. Click 'Create Token'\n" +
        "3. Use the 'Edit zone DNS' template, or create a custom token with:\n" +
        "   - Zone.Zone: Read\n" +
        "   - Zone.DNS: Edit\n" +
        "4. Set the token as CLOUDFLARE_API_TOKEN environment variable"
    );
  }

  return { apiToken };
}
