# Product catalog UI

This specification records the screens, how they call the product management API, and the choices made where the assignment and the API disagree.

## Screens

The app is Angular 21 with standalone components, the router, and `HttpClient`. `src/main.ts` boots `App`. The header is a home link labeled Products. Create and edit are modal dialogs. A click outside the dialog closes it, unless a save is in progress. Success and failure that are not field errors use a toast.

Routes:

- `/` is the product list.
- `/products/:id` is one product.
- Any other path returns to `/`.

### Product list

`GET /products/search?limit=12&skip=` loads one page. A search field sends `q` after a short pause and returns to the first page. Each card shows the title, the price, and a thumbnail, and links to that product. Previous, Next, and numbered pages sit together at the right. They move by 12.

While the request is in flight the page says `Loading products`. A failed request shows the error and a Retry button. An empty catalog says `No products yet.` A search with no matches says `No products match that search.`

### Product detail

The id comes from the route. A non-numeric id, `0`, or a `404` shows `Product not found` and `This product is not in the catalog.` Other failures show the error and Retry. A found product shows the title, description, price, category, and tags. Back to products starts with a left arrow. Delete asks in a dialog, then returns to the list.

### Create and update

New product opens the dialog from the list. Edit product opens the same dialog from the detail page, filled with the current product.

The form uses reactive controls. Errors show after the field is touched or the form is submitted.

- Title is required, trimmed, at most 200 characters.
- Price is required, greater than 0, and has at most two decimal places.
- Description is optional and at most 5000 characters.
- Category is one of the API's slugs. The control defaults to beauty.
- Tags are optional. Separate them with commas. At most 20 tags, 40 characters each.

Create sends `POST /products/add`. Update sends `PUT /products/{id}` with the same fields. A successful create toasts `Product created` and the list reloads onto the page that contains the new product. A successful update toasts `Product updated` and the detail shows the returned product. An API field error is written onto that control. A failure with no field error is a toast.

## How the app talks to the API

Base URL is `http://127.0.0.1:3000`, from the `API_BASE_URL` token.

- `GET /products/search` returns `{ products, total, skip, limit }`.
- `GET /products/{id}` returns one product, or 404.
- `POST /products/add` returns 201 and the stored product. The body is `{ title, description, category, price, tags }`.
- `PUT /products/{id}` merges the same fields.
- `DELETE /products/{id}` returns 204, or 404 when the id is missing.

A product is `{ id, title, description, category, price, tags }`. There is no thumbnail in that JSON. The UI paints one.

The API requires `description`, `category`, and `tags` on create. `tags` may be `[]`. A blank description is 400 with `issues[].path === "description"`. The form rejects a blank description before the request is sent.

## Assumptions

Prices are USD. The API stores cents and returns a JSON number.

The list does not send `sortBy` or `order`, so the API orders by id ascending. A new product has the highest id and shows on the last page when the first page is full.

Requests run in the browser after hydration. The server-rendered HTML is the loading state for a real id, and the not-found state for an id that cannot be a product.
