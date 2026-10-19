# Issue 19 implementation

Partial implementation on `feat/issue-19-trusted-counselor-gate`.

The trusted decision seam now runs before draft persistence, controls counselor gates, and refuses unavailable decisions without storing a draft. The HTTP route awaits the asynchronous service method.

Validation is blocked because existing direct callers/tests still assume synchronous `createDraft`; those callers need migration before typecheck and `npm run gate:ci` can pass.
