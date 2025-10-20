// Type declarations for canvas module
declare module 'canvas' {
    export interface Canvas {
        width: number;
        height: number;
        toBuffer(mimeType?: string, config?: any): Buffer;
        getContext(contextId: '2d'): CanvasRenderingContext2D;
    }

    export interface Image {
        src: string | Buffer;
        width: number;
        height: number;
    }

    export interface CanvasRenderingContext2D {
        drawImage(image: Image, dx: number, dy: number): void;
        drawImage(image: Image, dx: number, dy: number, dWidth: number, dHeight: number): void;
        fillStyle: string | CanvasGradient | CanvasPattern;
        globalAlpha: number;
        font: string;
        textAlign: 'start' | 'end' | 'left' | 'right' | 'center';
        textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom';
        fillText(text: string, x: number, y: number, maxWidth?: number): void;
        measureText(text: string): { width: number; actualBoundingBoxAscent?: number; actualBoundingBoxDescent?: number };
        beginPath(): void;
        moveTo(x: number, y: number): void;
        lineTo(x: number, y: number): void;
        lineWidth: number;
        strokeStyle: string | CanvasGradient | CanvasPattern;
        stroke(): void;
        save(): void;
        restore(): void;
        translate(x: number, y: number): void;
        rotate(angle: number): void;
    }

    export interface CanvasGradient {}
    export interface CanvasPattern {}

    export function createCanvas(width: number, height: number): Canvas;
    export function loadImage(src: string | Buffer): Promise<Image>;
}


