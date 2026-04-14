export type SupportedOutputFormat = 'jpg' | 'png' | 'pdf' | 'mp3' | 'wav' | 'csv' | 'json' | 'yaml';

export interface ConverterDefinition<TFormat extends SupportedOutputFormat = SupportedOutputFormat> {
  key: string;
  label: string;
  inputExtensions: readonly string[];
  outputFormats: readonly TFormat[];
  defaultOutputFormat: TFormat;
  convert: (options: { inputPath: string; outputPath: string; format: TFormat }) => Promise<string>;
  buildDefaultOutputPath: (inputPath: string, format: TFormat) => string;
}


