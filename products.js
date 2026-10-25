const MALL_CATEGORIES = [
  { name: "Fashion", icon: "✳", subcategories: ["Women", "Men", "Shoes", "Bags", "Jewelry"] },
  { name: "Home & living", icon: "⌂", subcategories: ["Decor", "Kitchen", "Bedding", "Lighting", "Furniture"] },
  { name: "Beauty", icon: "✿", subcategories: ["Skincare", "Makeup", "Haircare", "Fragrance"] },
  { name: "Electronics", icon: "⌁", subcategories: ["Audio", "Accessories", "Smart home", "Computers"] },
  { name: "Kids", icon: "♡", subcategories: ["Clothing", "Toys", "Nursery", "Books"] },
  { name: "Wellness", icon: "☼", subcategories: ["Self care", "Fitness", "Bath", "Mindfulness"] },
];

const MALL_PRODUCTS = [
  { id: "linen-throw", name: "Everyday Linen Throw", category: "Home & living", subcategory: "Bedding", price: 68, badge: "Bestseller", rating: 4.9, reviews: 128, image: "https://images.unsplash.com/photo-1600369671236-e74521d4b6ad?auto=format&fit=crop&w=900&q=82", alt: "Soft natural linen throw draped over a chair" },
  { id: "stoneware-mug", name: "Sunday Stoneware Mug", category: "Home & living", subcategory: "Kitchen", price: 28, badge: "Handmade", rating: 4.8, reviews: 86, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=82", alt: "Handmade ceramic cup in a warm neutral glaze" },
  { id: "market-tote", name: "The Market Tote", category: "Fashion", subcategory: "Bags", price: 42, badge: "Made to last", rating: 4.7, reviews: 54, image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=82", alt: "Everyday carryall bag in a natural color" },
  { id: "oak-board", name: "Little Oak Serving Board", category: "Home & living", subcategory: "Kitchen", price: 54, badge: "", rating: 4.9, reviews: 32, image: "https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=900&q=82", alt: "Warm-toned wooden serving board on a kitchen table" },
  { id: "bud-vase", name: "The Bud Vase", category: "Home & living", subcategory: "Decor", price: 36, badge: "Small batch", rating: 4.8, reviews: 43, image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=900&q=82", alt: "Sculptural small ceramic vase" },
  { id: "cotton-shirt", name: "Sunday Cotton Shirt", category: "Fashion", subcategory: "Men", price: 84, badge: "", rating: 4.6, reviews: 65, image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=82", alt: "Relaxed fit, light-colored cotton shirt" },
  { id: "soft-candle", name: "Soft Light Candle", category: "Home & living", subcategory: "Decor", price: 32, badge: "A little ritual", rating: 4.9, reviews: 103, image: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=900&q=82", alt: "A softly glowing candle in a glass vessel" },
  { id: "woven-cushion", name: "Woven Sunday Cushion", category: "Home & living", subcategory: "Bedding", price: 62, badge: "", rating: 4.7, reviews: 39, image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=82", alt: "Textured neutral cushion on a comfortable sofa" },
  { id: "daily-serum", name: "Daily Dew Face Serum", category: "Beauty", subcategory: "Skincare", price: 34, badge: "Plant powered", rating: 4.8, reviews: 212, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=82", alt: "Minimal skincare bottle on a neutral background" },
  { id: "wireless-headphones", name: "Studio Wireless Headphones", category: "Electronics", subcategory: "Audio", price: 129, badge: "New", rating: 4.7, reviews: 91, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82", alt: "Premium over-ear headphones" },
  { id: "soft-knit", name: "The Soft Knit Sweater", category: "Fashion", subcategory: "Women", price: 96, badge: "", rating: 4.9, reviews: 47, image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=82", alt: "Comfortable neutral knit sweater" },
  { id: "weekend-bottle", name: "Everywhere Water Bottle", category: "Wellness", subcategory: "Fitness", price: 38, badge: "Staff pick", rating: 4.6, reviews: 71, image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=82", alt: "Reusable stainless water bottle" },
];

if (typeof window !== "undefined") {
  window.MALL_CATEGORIES = MALL_CATEGORIES;
  window.MALL_PRODUCTS = MALL_PRODUCTS;
}
