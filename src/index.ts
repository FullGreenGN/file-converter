
import path from 'node:path';
import { access } from 'node:fs/promises';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { convertDocxToPdf } from './converters/document.js';
import { convertHeicToImage, type ImageOutputFormat } from './converters/image.js';

type SupportedInputType = 'heic' | 'docx';

interface CliOptions {
  format?: ImageOutputFormat;
}

const program = new Command();

program
  .name('fullgreen-convert')
  .description('Convert .heic images to .jpg/.png and .docx documents to .pdf')
  .argument('[input]', 'input file path')
  .argument('[output]', 'output file path')
  .option('-f, --format <format>', 'output format for HEIC conversion (jpg|png)')
  .action(async (input?: string, output?: string, options?: CliOptions) => {
	try {
	  if (!input) {
		await runInteractiveMode();
		return;
	  }

	  await runDirectMode(input, output, options ?? {});
	} catch (error) {
	  handleFatalError(error);
	}
  });

program.parseAsync(process.argv).catch((error) => handleFatalError(error));

async function runDirectMode(inputPathRaw: string, outputPathRaw?: string, options?: CliOptions): Promise<void> {
  const inputPath = resolvePath(inputPathRaw);
  await ensureFileExists(inputPath);

  const inputType = detectInputType(inputPath);
  const imageFormat = resolveImageFormat(options?.format);
  const outputPath = resolveOutputPath({ inputPath, outputPathRaw, inputType, imageFormat });

  const spinner = ora(`Converting ${chalk.cyan(path.basename(inputPath))}...`).start();
  try {
	await convertByType({ inputPath, outputPath, inputType, imageFormat });
	spinner.succeed(chalk.green(`Conversion completed: ${outputPath}`));
  } catch (error) {
	spinner.fail(chalk.red('Conversion failed'));
	throw error;
  }
}

async function runInteractiveMode(): Promise<void> {
  const answers = await inquirer.prompt<{
	inputPathRaw: string;
  }>([
	{
	  type: 'input',
	  name: 'inputPathRaw',
	  message: 'Input file path:',
	  validate: (value: string) => (value.trim().length > 0 ? true : 'Please provide an input file path.'),
	},
  ]);

  const inputPath = resolvePath(answers.inputPathRaw);
  await ensureFileExists(inputPath);
  const inputType = detectInputType(inputPath);

  let imageFormat: ImageOutputFormat = 'jpg';
  if (inputType === 'heic') {
	const imageAnswers = await inquirer.prompt<{
	  format: ImageOutputFormat;
	}>([
	  {
		type: 'list',
		name: 'format',
		message: 'Select output image format:',
		choices: [
		  { name: 'JPG', value: 'jpg' },
		  { name: 'PNG', value: 'png' },
		],
	  },
	]);
	imageFormat = imageAnswers.format;
  }

  const defaultOutputPath = buildDefaultOutputPath({ inputPath, inputType, imageFormat });
  const outputAnswers = await inquirer.prompt<{
	outputPathRaw: string;
  }>([
	{
	  type: 'input',
	  name: 'outputPathRaw',
	  message: 'Output file path:',
	  default: defaultOutputPath,
	  filter: (value: string) => value.trim(),
	  validate: (value: string) => (value.trim().length > 0 ? true : 'Please provide an output file path.'),
	},
  ]);

  const outputPath = resolvePath(outputAnswers.outputPathRaw);
  const spinner = ora(`Converting ${chalk.cyan(path.basename(inputPath))}...`).start();
  try {
	await convertByType({ inputPath, outputPath, inputType, imageFormat });
	spinner.succeed(chalk.green(`Conversion completed: ${outputPath}`));
  } catch (error) {
	spinner.fail(chalk.red('Conversion failed'));
	throw error;
  }
}

async function convertByType(params: {
  inputPath: string;
  outputPath: string;
  inputType: SupportedInputType;
  imageFormat: ImageOutputFormat;
}): Promise<void> {
  const { inputPath, outputPath, inputType, imageFormat } = params;

  if (inputType === 'heic') {
	await convertHeicToImage({
	  inputPath,
	  outputPath,
	  format: imageFormat,
	});
	return;
  }

  await convertDocxToPdf({
	inputPath,
	outputPath,
  });
}

function detectInputType(inputPath: string): SupportedInputType {
  const extension = path.extname(inputPath).toLowerCase();
  if (extension === '.heic') {
	return 'heic';
  }

  if (extension === '.docx') {
	return 'docx';
  }

  throw new Error(`Unsupported input format: ${extension || 'unknown'}. Supported formats are .heic and .docx.`);
}

function resolveImageFormat(format?: string): ImageOutputFormat {
  if (!format) {
	return 'jpg';
  }

  const normalized = format.toLowerCase();
  if (normalized !== 'jpg' && normalized !== 'png') {
	throw new Error(`Invalid format option: ${format}. Allowed values are jpg or png.`);
  }

  return normalized;
}

function resolveOutputPath(params: {
  inputPath: string;
  outputPathRaw?: string;
  inputType: SupportedInputType;
  imageFormat: ImageOutputFormat;
}): string {
  const { inputPath, outputPathRaw, inputType, imageFormat } = params;
  if (outputPathRaw) {
	return resolvePath(outputPathRaw);
  }

  return buildDefaultOutputPath({ inputPath, inputType, imageFormat });
}

function buildDefaultOutputPath(params: {
  inputPath: string;
  inputType: SupportedInputType;
  imageFormat: ImageOutputFormat;
}): string {
  const { inputPath, inputType, imageFormat } = params;
  const outputExt = inputType === 'heic' ? imageFormat : 'pdf';
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${outputExt}`);
}

function resolvePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
	await access(filePath);
  } catch {
	throw new Error(`Input file not found: ${filePath}`);
  }
}

function handleFatalError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}
