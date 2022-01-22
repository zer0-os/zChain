import BufferList = require("bl");

type WrappedDuplex = {
    read(bytes?: number): Promise<BufferList>;
    readLP(): Promise<BufferList>;
    readPB<T>(proto: {decode: (data: Uint8Array) => T}): Promise<T>;
    write(input: BufferList): void;
    writeLP(input: Uint8Array | BufferList): void;
    writePB(data: Uint8Array | BufferList, proto: {encode: (data: any) => Uint8Array}): void;

    pb<Return>(proto: {encode: (data: any) => Uint8Array, decode: (data: Uint8Array) => Return}): {read: () => Return, write: (d: Uint8Array) => void}
    //return vanilla duplex
    unwrap(): any;
}

declare interface LengthDecoderFunction {
    (data: Uint8Array | BufferList): number;
    bytes: number;
}

declare interface LengthEncoderFunction {
    (value: number, target: Uint8Array, offset: number): number|Uint8Array;
    bytes: number;
}

interface Opts {
    //encoding opts
    poolSize: number;
    minPoolSize: number;
    lengthEncoder: LengthEncoderFunction;

    //decoding opts
    lengthDecoder: LengthDecoderFunction;
    maxLengthLength: number;
    maxDataLength: number;
}

declare function Wrap (duplex: any, opts?: Partial<Opts>): WrappedDuplex;

export = Wrap;
