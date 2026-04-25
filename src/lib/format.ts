export const inr = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};
export const num = (n: number) => n.toLocaleString("en-IN");
export const inrFull = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
