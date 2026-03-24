# Cloudflare/OpenNext

Cloudflare/OpenNext remains an alternate worker deployment path rather than the primary production model.

The current production deployment is Vercel. If you revisit the Cloudflare path later, the relevant root-level files are:

- [open-next.config.ts](../../open-next.config.ts)
- [wrangler.jsonc](../../wrangler.jsonc)
- [deploy-cloudflare workflow](../../.github/workflows/deploy-cloudflare.yml)

Those files stay at the repository root because the associated toolchain expects those filenames in place.
