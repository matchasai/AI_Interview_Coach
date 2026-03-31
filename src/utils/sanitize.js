function toLowerTrim(value) {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase();
}

function trim(value) {
  if (typeof value !== "string") return value;
  return value.trim();
}

module.exports = { toLowerTrim, trim };
