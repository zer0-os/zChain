export interface LengthDecoderFunction {
    (data: Uint8Array): number;
    bytes: number;
}
export declare const varintDecode: LengthDecoderFunction;
//# sourceMappingURL=varint-decode.d.ts.map