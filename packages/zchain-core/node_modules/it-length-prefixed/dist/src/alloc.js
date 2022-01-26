export function alloc(len) {
    return new Uint8Array(len);
}
export function allocUnsafe(len) {
    if (globalThis?.Buffer?.allocUnsafe != null) {
        return globalThis.Buffer.allocUnsafe(len);
    }
    return new Uint8Array(len);
}
//# sourceMappingURL=alloc.js.map