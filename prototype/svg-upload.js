const MAX_FILE_SIZE = 1024 * 1024;
const allowedTags = new Set(["svg","g","path","rect","circle","ellipse","polygon","polyline","line","text","tspan","defs","clipPath","mask","linearGradient","radialGradient","stop","title","desc"]);

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("素材读取失败"));
    reader.readAsDataURL(file);
  });
}

export function validateUpload(file, types) {
  if (!file) throw new Error("请选择文件");
  if (file.size > MAX_FILE_SIZE) throw new Error("文件超过1MB限制");
  if (!types.includes(file.type)) throw new Error(`不支持的文件类型：${file.type || "未知"}`);
}

export function sanitizeSvg(svgString, { fragment = false } = {}) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgString, "image/svg+xml");
  if (documentNode.querySelector("parsererror") || documentNode.documentElement.localName !== "svg") throw new Error("SVG无法解析");
  [...documentNode.querySelectorAll("*")].forEach(element => {
    if (!allowedTags.has(element.localName)) { element.remove(); return; }
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || name === "style" || ((name === "href" || name === "xlink:href") && /^(https?:|javascript:|data:text)/i.test(value))) element.removeAttribute(attribute.name);
    });
  });
  const serializer = new XMLSerializer();
  if (fragment) return [...documentNode.documentElement.children].map(node => serializer.serializeToString(node)).join("");
  return serializer.serializeToString(documentNode.documentElement);
}
