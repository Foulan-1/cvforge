import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon & Meta */}
        <link rel="icon" href="/favicon.png" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="description" content="AI-powered CV generator — professional, ATS-optimized CVs in under 2 minutes. Free to try." />
        <meta property="og:title" content="CVForge.ai — AI CV Generator" />
        <meta property="og:description" content="Generate a professional CV tailored to your industry in under 2 minutes." />
        <meta property="og:url" content="https://cvforger-sh.vercel.app" />
        <title>CVForge.ai — AI CV Generator</title>
        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-DGMQJ8Z3MJ" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-DGMQJ8Z3MJ');
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
