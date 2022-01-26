import varint from 'varint';
export const varintDecode = (data) => {
    const len = varint.decode(data);
    varintDecode.bytes = varint.decode.bytes;
    return len;
};
varintDecode.bytes = 0;
//# sourceMappingURL=varint-decode.js.map