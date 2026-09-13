/** View transform per SPEC Task 12: {scale, offsetX, offsetY},
 * screen→canvas = (client − offset) / scale. Two-pointer pinch+pan and
 * mouse wheel are handled by the caller through this API. */

export interface Point {
  x: number;
  y: number;
}

export class ViewTransform {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  minScale = 0.05;
  maxScale = 12;

  apply(el: HTMLElement): void {
    el.style.transformOrigin = '0 0';
    el.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  toCanvas(clientX: number, clientY: number, containerRect: DOMRect): Point {
    return {
      x: (clientX - containerRect.left - this.offsetX) / this.scale,
      y: (clientY - containerRect.top - this.offsetY) / this.scale,
    };
  }

  clampScale(scale: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, scale));
  }

  /** Zoom keeping the canvas point under (cx, cy) fixed (container coords). */
  zoomAt(cx: number, cy: number, factor: number): void {
    const next = this.clampScale(this.scale * factor);
    if (next === this.scale) return;
    this.offsetX = cx - ((cx - this.offsetX) / this.scale) * next;
    this.offsetY = cy - ((cy - this.offsetY) / this.scale) * next;
    this.scale = next;
  }

  /** Fit content into the container, centered. */
  fitTo(
    containerW: number,
    containerH: number,
    contentW: number,
    contentH: number,
    padding = 24,
  ): void {
    if (contentW <= 0 || contentH <= 0 || containerW <= 0 || containerH <= 0) return;
    const scale = this.clampScale(
      Math.min((containerW - padding) / contentW, (containerH - padding) / contentH),
    );
    this.scale = scale;
    this.offsetX = (containerW - contentW * scale) / 2;
    this.offsetY = (containerH - contentH * scale) / 2;
  }

  /** Two-finger gesture state: keep the canvas point under the initial
   * midpoint fixed while scale and midpoint move. */
  applyPinch(
    start: { dist: number; mid: Point; scale: number; canvasPoint: Point },
    nowDist: number,
    nowMid: Point,
  ): void {
    const next = this.clampScale((start.scale * nowDist) / Math.max(1, start.dist));
    this.scale = next;
    this.offsetX = nowMid.x - start.canvasPoint.x * next;
    this.offsetY = nowMid.y - start.canvasPoint.y * next;
  }
}
