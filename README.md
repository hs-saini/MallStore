# MallStore

MallStore is a responsive static storefront built with HTML, CSS, and vanilla
JavaScript. It has no backend, database, build step, or package dependencies.

## Preview locally

Open `index.html` in a browser, or serve this folder with a local HTTP server:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Included demo features

- Product catalog with department and subcategory filters, search, and sorting
- Shopping bag, quantity controls, wishlist, and sample checkout
- Browser-only customer accounts, saved addresses, and order history
- Seller studio with local product listings and image uploads
- Responsive layouts, accessible controls, and a demo help page

## Demo limitations

All accounts, bags, wishlists, addresses, seller listings, and orders are saved
in the current browser's local storage. They are not shared with other visitors
or devices. Passwords are hashed in the browser, but this is not production
authentication and must not be used for real customer data. Checkout never
collects or processes payment details and does not arrange delivery.
Newsletter signup is not connected and does not store email addresses. Before
using MallStore as a real business, it needs a secure backend, persistent
database, payment and shipping providers, and real support and store policies.

## Free GitHub Pages deployment

GitHub Pages is configured to publish the contents of the `main` branch root.
New pushes are published automatically on GitHub's free static hosting. The
free site URL is:

<https://hs-saini.github.io/MallStore/>
