import type maplibregl from "maplibre-gl";

export class SkopeColorbar implements maplibregl.IControl {
  private _container: HTMLDivElement | null = null;
  private _vmin: number;
  private _vmax: number;
  private _units: string | undefined;
  private readonly _colors: string[];

  private static _idCounter = 0;
  private readonly _gradientId: string;

  private static readonly BAR_H = 140;
  private static readonly BAR_W = 16;
  private static readonly PAD = 6;
  private static readonly TICKS = 5;

  constructor(opts: { colors: string[]; vmin: number; vmax: number; units?: string }) {
    this._colors = opts.colors;
    this._vmin = opts.vmin;
    this._vmax = opts.vmax;
    this._units = opts.units;
    this._gradientId = `skope-cmap-${SkopeColorbar._idCounter++}`;
  }

  onAdd(_map: maplibregl.Map): HTMLElement {
    this._container = document.createElement("div");
    this._container.className = "skope-colorbar maplibregl-ctrl";
    this._render();
    return this._container;
  }

  onRemove(): void {
    this._container?.remove();
    this._container = null;
  }

  update(opts: { vmin?: number; vmax?: number; units?: string }): void {
    if (opts.vmin !== undefined) this._vmin = opts.vmin;
    if (opts.vmax !== undefined) this._vmax = opts.vmax;
    if ("units" in opts) this._units = opts.units;
    if (this._container) this._render();
  }

  show(): void {
    if (this._container) this._container.style.display = "";
  }

  hide(): void {
    if (this._container) this._container.style.display = "none";
  }

  private _render(): void {
    if (!this._container) return;
    const { BAR_H, BAR_W, PAD, TICKS } = SkopeColorbar;
    const svgH = BAR_H + PAD * 2;
    const tickX = BAR_W;
    const labelX = BAR_W + 6;
    const svgW = BAR_W + 52;

    const stops = this._colors
      .slice()
      .reverse()
      .map((c, i) => {
        const offset = ((i / (this._colors.length - 1)) * 100).toFixed(1);
        return `<stop offset="${offset}%" stop-color="${c}"/>`;
      })
      .join("");

    const range = this._vmax - this._vmin || 1;
    const tickLines = Array.from({ length: TICKS }, (_, i) => {
      const v = this._vmax - (i / (TICKS - 1)) * range;
      const y = (PAD + 0.5) + ((BAR_H - 1) * (this._vmax - v)) / range;
      const valueText = v.toFixed(1);
      return `
        <line x1="${tickX}" y1="${y.toFixed(1)}" x2="${tickX + 4}" y2="${y.toFixed(1)}"
              stroke="#666" stroke-width="1"/>
        <text x="${labelX}" y="${y.toFixed(1)}" dominant-baseline="middle"
              font-size="10" font-family="sans-serif" fill="#333">${valueText}</text>`;
    }).join("");

    this._container.innerHTML = `
      ${this._units ? `<div class="skope-colorbar__units">Units: ${this._units}</div>` : ""}
      <svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${this._gradientId}" x1="0" y1="0" x2="0" y2="1">
            ${stops}
          </linearGradient>
        </defs>
        <rect x="0" y="${PAD}" width="${BAR_W}" height="${BAR_H}"
              fill="url(#${this._gradientId})"/>
        ${tickLines}
      </svg>`;
  }
}
