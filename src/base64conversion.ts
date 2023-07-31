export class base64conversion {
    public convertDataURIToBinary (dataURI: string) {

        const BASE64_MARKER = ';base64,';
        const pdfAsDataUri = "data:application/pdf;base64," + dataURI;
        const base64Index = pdfAsDataUri.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
        const base64 = pdfAsDataUri.substring(base64Index);
        const raw = Buffer.from(base64,'base64').toString('binary');
        const rawLength = raw.length;
        const array = new Uint8Array(new ArrayBuffer(rawLength));

        for(let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }
        return array;
    }

    public isBase64(str: string): boolean {
        const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        return base64Regex.test(str);
    }
}