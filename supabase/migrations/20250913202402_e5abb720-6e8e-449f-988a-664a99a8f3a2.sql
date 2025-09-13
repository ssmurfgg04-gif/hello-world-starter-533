-- Seed N Kandles products data
INSERT INTO public.products (name, description, benefits, price, category, scent, size, skin_type, materials, images, in_stock, bestseller, featured) VALUES

-- Candles (6 products)
('Lavender Dreams Candle', 'Hand-poured soy wax candle infused with premium French lavender essential oil. Perfect for creating a serene bedtime atmosphere.', 'Promotes relaxation and better sleep quality. Reduces stress and anxiety. Creates a peaceful ambiance for meditation and self-care.', 1200, 'Candles', 'Lavender', '200g', NULL, 'Soy wax, Cotton wick, Lavender essential oil', ARRAY['https://images.unsplash.com/photo-1544980919-e17526d4ed0d?w=800'], true, true, true),

('Vanilla Bliss Candle', 'Luxurious vanilla-scented candle with warm, comforting notes. Handcrafted with natural ingredients for a cozy atmosphere.', 'Enhances mood and creates warmth. Natural stress reliever. Perfect for romantic settings and relaxation.', 1200, 'Candles', 'Vanilla', '200g', NULL, 'Soy wax, Cotton wick, Vanilla extract', ARRAY['https://images.unsplash.com/photo-1602874801006-52c3bb0ff00d?w=800'], true, true, false),

('Eucalyptus Refresh Candle', 'Invigorating eucalyptus candle that purifies the air and awakens your senses. Made with organic eucalyptus oil.', 'Clears respiratory pathways. Natural air purifier. Boosts energy and mental clarity.', 1200, 'Candles', 'Eucalyptus', '200g', NULL, 'Soy wax, Cotton wick, Eucalyptus essential oil', ARRAY['https://images.unsplash.com/photo-1571779062447-8e4de988e2be?w=800'], true, false, false),

('Sandalwood Serenity Candle', 'Premium sandalwood candle with earthy, grounding properties. Perfect for meditation and spiritual practices.', 'Promotes inner peace and spiritual connection. Enhances focus during meditation. Creates sacred space.', 1200, 'Candles', 'Sandalwood', '200g', NULL, 'Soy wax, Cotton wick, Sandalwood essential oil', ARRAY['https://images.unsplash.com/photo-1578662015141-48ac5f1ec841?w=800'], true, false, false),

('Citrus Burst Candle', 'Energizing blend of orange, lemon, and grapefruit oils. Brightens any space with fresh, uplifting fragrance.', 'Boosts energy and mood. Natural air freshener. Enhances creativity and mental alertness.', 1200, 'Candles', 'Citrus', '200g', NULL, 'Soy wax, Cotton wick, Citrus essential oils blend', ARRAY['https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800'], true, false, true),

('Amber Glow Candle', 'Sophisticated amber-scented candle with warm, mysterious notes. Creates an elegant ambiance for special occasions.', 'Evokes warmth and sophistication. Perfect for romantic settings. Long-lasting premium fragrance.', 1200, 'Candles', 'Amber', '200g', NULL, 'Soy wax, Cotton wick, Amber fragrance oil', ARRAY['https://images.unsplash.com/photo-1602874801234-f2f89f77c362?w=800'], true, true, false),

-- Face Masks (3 products)
('Aloe Hydrating Face Mask', 'Deeply moisturizing face mask enriched with organic aloe vera and hyaluronic acid. Perfect for dry and sensitive skin.', 'Intense hydration for 24 hours. Soothes irritated skin. Reduces redness and inflammation. Suitable for daily use.', 450, 'Face Masks', NULL, '50ml', 'Dry, Sensitive', 'Aloe vera gel, Hyaluronic acid, Vitamin E', ARRAY['https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800'], true, false, true),

('Charcoal Detox Face Mask', 'Purifying charcoal mask that draws out impurities and excess oil. Ideal for oily and acne-prone skin types.', 'Deep pore cleansing. Removes blackheads and whiteheads. Controls oil production. Minimizes pore appearance.', 450, 'Face Masks', NULL, '50ml', 'Oily, Acne-prone', 'Activated charcoal, Bentonite clay, Tea tree oil', ARRAY['https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800'], true, true, false),

('Rose Brightening Face Mask', 'Illuminating rose mask with vitamin C and natural botanicals. Evens skin tone and adds a natural glow.', 'Brightens complexion. Reduces dark spots and hyperpigmentation. Anti-aging properties. Adds radiant glow.', 450, 'Face Masks', NULL, '50ml', 'All skin types', 'Rose extract, Vitamin C, Kojic acid, Rosehip oil', ARRAY['https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=800'], true, false, false),

-- Bundle (1 product)
('Ultimate Relaxation Gift Set', 'Complete wellness bundle featuring our bestselling Lavender Dreams candle, Aloe Hydrating mask, and a premium gift box. Perfect for gifting or personal indulgence.', 'Complete self-care experience. Perfect for stress relief and relaxation. Includes premium gift packaging. Ideal for special occasions and gifting.', 2800, 'Bundles', 'Mixed', 'Gift Set', 'All skin types', 'Includes: Lavender candle, Aloe mask, Gift box, Care instructions', ARRAY['https://images.unsplash.com/photo-1549068106-b024baf5062d?w=800'], true, true, true);

-- Update some products to have multiple images for variety
UPDATE public.products SET images = ARRAY[
  'https://images.unsplash.com/photo-1544980919-e17526d4ed0d?w=800',
  'https://images.unsplash.com/photo-1602874801006-52c3bb0ff00d?w=400'
] WHERE name = 'Lavender Dreams Candle';

UPDATE public.products SET images = ARRAY[
  'https://images.unsplash.com/photo-1549068106-b024baf5062d?w=800',
  'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400',
  'https://images.unsplash.com/photo-1544980919-e17526d4ed0d?w=400'
] WHERE name = 'Ultimate Relaxation Gift Set';