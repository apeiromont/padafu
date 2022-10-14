import { Context, RouterContext } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import puppeteer, {
  Browser,
  PaperFormat,
} from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { readAll } from "https://deno.land/std@0.159.0/streams/conversion.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.93.0/io/streams.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib";

async function withPdfMetadata(
  original: Uint8Array,
  metadata: PDFMetadata | undefined,
): Promise<[number, Uint8Array]> {
  const doc = await PDFDocument.load(original);

  if (metadata) {
    if (metadata.title) {
      doc.setTitle(metadata.title);
    }
    if (metadata.author) {
      doc.setAuthor(metadata.author);
    }
    if (metadata.subject) {
      doc.setSubject(metadata.subject);
    }
    if (metadata.keywords) {
      doc.setKeywords(metadata.keywords);
    }
    if (metadata.producer) {
      doc.setProducer(metadata.producer);
    }
    if (metadata.creator) {
      doc.setCreator(metadata.creator);
    }

    return [doc.getPageCount(), await doc.save()];
  } else {
    return [doc.getPageCount(), original];
  }
}

async function withExecutionTime<T>(
  fn: () => Promise<T>,
): Promise<[number, T | Error]> {
  const _startMark = performance.mark("start");
  let res: T | Error;
  try {
    res = await fn();
  } catch (e) {
    res = e;
  } finally {
    const _endMark = performance.mark("end");
  }
  const duration = performance.measure("duration", "start", "end");
  return [duration.duration, res];
}

export interface PDFMetadata {
  title: string | undefined;
  author: string | undefined;
  subject: string | undefined;
  keywords: string[] | undefined;
  producer: string | undefined;
  creator: string | undefined;
}

export interface RenderPdfRequest {
  html: string;
  pageSize?: PaperFormat;
  filename?: string;
  margin?: string;
  metadata?: PDFMetadata;
}

async function renderPdf(req: RenderPdfRequest): Promise<[number, Uint8Array]> {
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(req.html, {
      waitUntil: "domcontentloaded",
    });

    const footerTemplate = `<div
    id="footer-template"
    style="
      font-family: Arial;
      font-size: 10px !important;
      color: black;
      text-align: right;
      width: 100%;
      padding-right: 2em;"
  >
    <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

    const pdfBytesStream = await page.createPDFStream({
      margin: {
        top: req.margin,
        right: req.margin,
        bottom: req.margin,
        left: req.margin,
      },
      format: req.pageSize,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate,
    });

    const [pageCount, pdfBytes] = await withPdfMetadata(
      await readAll(
        readerFromStreamReader(pdfBytesStream.getReader()),
      ),
      req.metadata,
    );

    return [pageCount, pdfBytes];
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

export async function apiRenderPdf(ctx: Context) {
  const { value } = ctx.request.body({ type: "json" });
  const {
    html,
    pageSize = "letter",
    filename = "rendered",
    margin = "0.4in",
    metadata = {
      title: "Quarterly Account Statement",
      author: "OctaveWealth",
      subject: "Quarterly Account Statement",
      keywords: ["octavewealth", "account-statement"],
      producer: "OctaveWealth",
      creator: "octavewealth.com",
    },
  }: RenderPdfRequest = await value;

  try {
    const [duration, result] = await withExecutionTime(() =>
      renderPdf({
        html,
        pageSize,
        filename,
        margin,
        metadata,
      })
    );

    if (result instanceof Error) {
      transmitBilling(duration, 0, 0);
      throw result;
    } else {
      const [pageCount, pdfBytes] = result;
      transmitBilling(duration, pageCount, pdfBytes.length);
      ctx.response.headers.set("Content-Type", "application/pdf");
      ctx.response.headers.set(
        "Content-Disposition",
        `attachment; filename=${filename}.pdf`,
      );
      ctx.response.body = pdfBytes;
    }
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
    ctx.response.body = {
      err: e.message,
    };
  }
}

function transmitBilling(
  duration: number,
  pageCount: number,
  pdfBytesLength: number,
) {
  console.log({
    durationInMs: duration,
    pageCount,
    pdfBytesLength,
  });
}
