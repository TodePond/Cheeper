/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.133.0/http/server.ts";
import { router } from "https://crux.land/router@0.0.11";
import { h, ssr } from "https://crux.land/nanossr@0.0.4";

const render = (component) => ssr(() => <App>{component}</App>);

serve(router(
  {
    "/": () => render(<Landing />),
    "/stats": () => render(<Stats />),
    "/bagels": () => render(<Bagels />),
  },
  () => render(<NotFound />),
));

function App({ children }) {
  return (
    <div class="min-h-screen">
      <NavBar />
      {children}
    </div>
  );
}

function NavBar() {
  return (
    <nav class="font-sans flex flex-col text-center sm:flex-row sm:text-left sm:justify-between py-4 px-6 bg-white shadow sm:items-baseline w-full">
     <div class="mb-2 sm:mb-0">
      <a href="/" class="text-2xl no-underline hover:text-indigo-800">The Bagel Company</a>
     </div>
     <div>
        <a href="/stats" class="text-lg no-underline hover:text-indigo-800 ml-3">Stats</a>
        <a href="/bagels" class="text-lg no-underline hover:text-indigo-800 ml-3">Bagels</a>
     </div>
    </nav>
  );
}

function Landing() {
  return (
    <div class="flex justify-center items-center">
      <div class="max-w-7xl py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 class="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
          <span class="block">Ready to dive in?</span>
          <span class="block text-indigo-600">Find your bagel today.</span>
        </h2>
        <div class="mt-8 flex lg:mt-0 lg:flex-shrink-0 lg:ml-8">
          <div class="inline-flex rounded-md shadow">
            <a href="/bagels" class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"> Get started </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { name: "Total Sales", stat: "41,897" },
    { name: "Available Bagels", stat: "357" },
    { name: "Avg. Open Rate", stat: "94.16%" },
  ];

  return (
    <div class="p-5">
      <h3 class="text-lg leading-6 font-medium text-gray-900">Last 30 days</h3>
      <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.name} class="px-4 py-5 shadow rounded-lg bg-white overflow-hidden sm:p-6">
            <dt class="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900">{item.stat}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}


const bagels = [
  {
    name: "Salmon Bagel",
    price: 5.39,
    image: "https://images.unsplash.com/photo-1592767049184-0fda840ae4e7?w=1080",
  },
  {
    name: "Cream Cheese Bagel",
    price: 2.49,
    image: "https://images.unsplash.com/photo-1585841393012-e4ded4a6e2d0?w=1080",
  },
  {
    name: "Bacon and Rucola Bagel",
    price: 4.19,
    image: "https://images.unsplash.com/photo-1603712469481-e25f0bdb63aa?w=1080",
  },
  {
    name: "Egg and Ham Bagel",
    price: 3.79,
    image: "https://images.unsplash.com/photo-1605661479369-a8859129827b?w=1080",
  },
  {
    name: "Jam Bagel",
    price: 3.00,
    image: "https://images.unsplash.com/photo-1579821401035-450188d514da?w=1080",
  },
  {
    name: "Bagel Sandwich with Egg, Ham, Tomato, Lettuce & Mayo",
    price: 6.00,
    image: "https://images.unsplash.com/photo-1627308595325-182f10f20126?w=1080",
  },
];

function Bagels() {
  return (
    <div class="mx-auto py-12 px-4 max-w-7xl sm:px-6 lg:px-8 lg:py-24">
      <div class="space-y-4 mb-12 lg:mb-8">
        <h2 class="text-4xl font-extrabold tracking-tight sm:text-4xl">Find the right bagel for yourself!</h2>
      </div>
      <div class="grid grid-cols-1 gap-y-10 items-center sm:grid-cols-3 gap-x-6 lg:grid-cols-4 xl:grid-cols-4 xl:gap-x-8">
        {bagels.map((bagel) => (
          <div key={bagel.name} class="group">
            <div class="w-full bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={bagel.image}
                class="w-full h-full object-center object-cover group-hover:opacity-75"
                alt=""
              />
            </div>
            <h3 class="mt-4 text-sm text-gray-700">{bagel.name}</h3>
            <p class="mt-1 text-lg font-medium text-gray-900">${bagel.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div class="min-h-full px-4 py-16 sm:px-6 sm:py-24 md:grid md:place-items-center lg:px-8">
      <div class="max-w-max mx-auto">
        <main class="sm:flex">
          <p class="text-4xl font-extrabold text-indigo-600 sm:text-5xl">404</p>
          <div class="sm:ml-6">
            <div class="sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">Page not found</h1>
              <p class="mt-1 text-base text-gray-500">Please check the URL in the address bar and try again.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
