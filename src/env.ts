import { z } from "zod";

/**
 * Environment variables schema
 * This file validates environment variables at build time
 */
const envSchema = z.object({
	// GitHub token for Activity Graph
	GITHUB_TOKEN: z.string().optional(),

	// Webmention configuration (optional)
	WEBMENTION_API_KEY: z.string().optional(),
	WEBMENTION_URL: z
		.string()
		.regex(/^https?:\/\/.+/)
		.optional()
		.or(z.literal("")),
	WEBMENTION_PINGBACK: z
		.string()
		.regex(/^https?:\/\/.+/)
		.optional()
		.or(z.literal("")),

	// Site URL (provided by Astro in production)
	SITE: z
		.string()
		.regex(/^https?:\/\/.+/)
		.optional(),
});

/**
 * Validate environment variables
 * This is called during the build process
 */
function validateEnv() {
	try {
		const result = envSchema.safeParse(import.meta.env);
		if (!result.success) {
			console.error("❌ Invalid environment variables:");
			result.error.issues.forEach((issue) => {
				console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
			});
			// Don't throw in development, just warn
			if (import.meta.env.MODE === "production") {
				throw new Error("Environment validation failed. Please check your .env file.");
			}
			console.warn("⚠️  Continuing with invalid environment variables in development mode.");
			return import.meta.env;
		}
		return result.data;
	} catch (error) {
		console.error("❌ Environment validation error:", error);
		return import.meta.env;
	}
}

// Export validated environment variables
export const env = validateEnv();

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>;
