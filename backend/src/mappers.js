const { CATEGORIES } = require("./catalog");

const ICONS = Object.fromEntries(CATEGORIES.map((item) => [item.name, item.icon]));

function parseInterests(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function toClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cep: row.cep,
    street: row.street,
    number: row.number,
    complement: row.complement,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    interests: parseInterests(row.interests),
    hasAccount: row.user_id != null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    category: row.category,
    icon: ICONS[row.category] || "🎵",
    level: row.level,
    price: row.price_cents / 100,
    stock: row.stock,
    minStock: row.min_stock,
    lowStock: row.stock <= row.min_stock,
    description: row.description,
    active: row.active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toMovement(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity,
    reason: row.reason,
    note: row.note,
    orderId: row.order_id,
    userName: row.user_name || null,
    created_at: row.created_at,
  };
}

module.exports = { toClient, toProduct, toMovement, parseInterests };
