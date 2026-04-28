"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Factura = {
  total: number;
  createdAt: string;
};

export default function GraficaVentas({ facturas }: { facturas: Factura[] }) {
  const agrupar = () => {
    const mapa: Record<string, number> = {};

    facturas.forEach((f) => {
      const fecha = new Date(f.createdAt).toLocaleDateString("es-CO");

      mapa[fecha] = (mapa[fecha] || 0) + Number(f.total || 0);
    });

    return Object.entries(mapa).map(([fecha, total]) => ({
      fecha,
      total,
    }));
  };

  const data = agrupar();

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#f5c400"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}