// src/components/SEO.tsx
// Install first: npm install react-helmet-async
// Then wrap your App with <HelmetProvider> in main.tsx

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
}

const SITE_NAME = "CLBPrep";
const BASE_URL = "https://clbprep.com";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

export default function SEO({
  title = "Free CELPIP Practice Tests & Exam Prep",
  description = "Canada's #1 CELPIP prep platform. Practice Listening, Reading, Writing and Speaking with free tests, expert tips, and personalized feedback.",
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
