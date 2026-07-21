import path from "node:path";
import dotenv, { type DotenvConfigOptions } from "dotenv";
import { z } from "zod";

const ConfigSchema = z.object({
  OPENAI_API_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(1).optional(),
  ),
  OPENAI_TEXT_MODEL: z.literal("gpt-5.6-luna").default("gpt-5.6-luna"),
  OPENAI_IMAGE_MODEL: z.literal("gpt-image-2").default("gpt-image-2"),
  OPENAI_MODERATION_MODEL: z
    .literal("omni-moderation-latest")
    .default("omni-moderation-latest"),
  PORT: z.coerce.number().int().positive().default(4173),
  DATA_DIR: z.string().default("data"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function environmentFiles(cwd = process.cwd()): DotenvConfigOptions[] {
  return [
    { path: path.join(cwd, ".env.local"), override: false },
    { path: path.join(cwd, ".env"), override: false },
  ];
}

export function loadEnvironment(
  cwd = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
): void {
  for (const options of environmentFiles(cwd)) {
    dotenv.config({ ...options, processEnv: environment, quiet: true });
  }
}

export function readConfig(environment = process.env): AppConfig {
  return ConfigSchema.parse(environment);
}
