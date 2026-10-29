import { useEffect, useRef, useState } from 'react';
import { Undo2, Check } from 'lucide-react';
import { id, type NoteImage } from '../domain/book';
type Stroke = { color: string; width: number; points: [number, number][] };
export function DrawingPad({ onSave }: { onSave: (image: NoteImage) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState('#354b3d');
  const [width, setWidth] = useState(3);
  const draw = (items: Stroke[]) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1000, 650);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of items) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.points.forEach(([x, y], i) =>
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
      );
      if (s.points.length === 1)
        ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1] + 0.1);
      ctx.stroke();
    }
  };
  useEffect(() => draw(strokes), [strokes]);
  return (
    <div className="drawing-pad">
      <div className="drawing-controls">
        <label>
          Ink
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          Stroke width
          <input
            type="range"
            min={1}
            max={14}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <button
          className="secondary-button"
          disabled={!strokes.length}
          onClick={() => setStrokes((all) => all.slice(0, -1))}
        >
          <Undo2 size={15} />
          Undo
        </button>
      </div>
      <canvas
        ref={canvas}
        width={1000}
        height={650}
        aria-label="Drawing canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const rect = e.currentTarget.getBoundingClientRect();
          active.current = {
            color,
            width,
            points: [
              [
                ((e.clientX - rect.left) / rect.width) * 1000,
                ((e.clientY - rect.top) / rect.height) * 650,
              ],
            ],
          };
          draw([...strokes, active.current]);
        }}
        onPointerMove={(e) => {
          if (!active.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          active.current.points.push([
            ((e.clientX - rect.left) / rect.width) * 1000,
            ((e.clientY - rect.top) / rect.height) * 650,
          ]);
          draw([...strokes, active.current]);
        }}
        onPointerUp={() => {
          const finished = active.current;
          if (finished) {
            active.current = null;
            setStrokes((all) => [...all, finished]);
          }
        }}
        onPointerCancel={() => {
          active.current = null;
          draw(strokes);
        }}
      />
      <div className="modal-footer">
        <button
          className="primary-button"
          disabled={!strokes.length}
          onClick={() => {
            if (canvas.current)
              onSave({
                id: id(),
                name: 'Drawing',
                dataUrl: canvas.current.toDataURL('image/png'),
              });
          }}
        >
          <Check size={16} />
          Attach drawing
        </button>
      </div>
    </div>
  );
}
