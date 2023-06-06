
export const isSourceHydraS2Account = (source: any): boolean => {
    return source && source?.commitmentReceipt !== undefined;
}