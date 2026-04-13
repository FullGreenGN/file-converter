declare module 'mammoth' {
  export interface ConvertToHtmlResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function convertToHtml(input: { path: string }): Promise<ConvertToHtmlResult>;

  const mammoth: {
    convertToHtml: typeof convertToHtml;
  };

  export default mammoth;
}

