# Product management web

Angular app for viewing, creating, updating, and deleting products. It calls the product management API. There is no database in this repo. The screens and the calls they make are in [specification.md](specification.md).

## Setup instructions

The API has to be running first. Its setup is in that repo's README. This app expects it at `http://127.0.0.1:3000`.

```bash
npm install
npm test
npm start
```

Open `http://127.0.0.1:4200/`. `npm test` runs QUnit against the form rules and the catalog parsers. `npm run test:e2e` installs Playwright Chromium and runs the browser tests. Those tests stub the API, so they do not need Postgres.

`npm run typecheck` checks the app and the tests. `npm run lint` runs oxlint. The pre-commit hook runs the typecheck and lint-staged.

## Key architectural decisions

The screen talks to one HTTP client, `ProductApi`. Components do not read raw JSON. `readProduct` and `readSearchPage` turn a response into a `Product` or a `SearchPage`, or throw `CatalogError`.

Create and edit share one dialog and one reactive form. The form rules live in `product-form.ts` so QUnit can call them without booting Angular. A blank title, a blank description, or a price that is not a positive number with at most two decimal places never leaves the browser.

The list asks `GET /products/search` for 12 rows at a time. The search box sends `q` after the typing pauses, and starts again at the first page. After a create, it clears the search and moves to the page that contains the new id under the API's default id order. Delete sends `DELETE /products/{id}` after a confirmation dialog.

Routes are `/` and `/products/:id`. Data loads in the browser. The server render is the loading shell, so `ng build` does not need the API.

## Trade-offs or assumptions

The API product has no image. Each card draws an SVG thumbnail from the title's first letter. Prices are shown as USD because the sample catalog uses amounts like `9.99` and the API does not name a currency.

Category is a select of the same 24 slugs the API accepts. Tags are an optional comma-separated field. Description is required, matching the API rule that a blank description is rejected.

Chakra UI and react-toastify render in React. This app is Angular 21, so the controls are Angular components and success and error notices are a small toast host. Tailwind is not used.

`AGENTS.md` and `.claude/CLAUDE.md` come from `ng generate ai-config` for this CLI. The source page is [Develop with AI](https://angular.dev/ai/develop-with-ai).

## What you would improve with more time

A shared OpenAPI document, generated from the API's Zod schemas, so this client stops copying the category list and the field limits by hand.

Search and sort controls. The API already supports `q`, `sortBy`, and `order`. The list only sends `limit` and `skip`.
