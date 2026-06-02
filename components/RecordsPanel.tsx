"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  X
} from "lucide-react";

import { api, CategoryOptions, Review, ReviewsResponse } from "@/lib/api";

type SortOrder = "asc" | "desc";
type SortKey =
  | "id"
  | "date"
  | "cliente"
  | "comment"
  | "category"
  | "subcategory"
  | "sentiment"
  | "product"
  | "predicted_classification"
  | "prediction_confidence"
  | "alert_sent"
  | "employee";

type RecordsFiltersState = {
  search: string;
  date_from: string;
  date_to: string;
  category: string;
  subcategory: string;
  sentiment: string;
  product: string;
  classification: string;
  alert_sent: string;
  employee_id: string;
};

const emptyFilters: RecordsFiltersState = {
  search: "",
  date_from: "",
  date_to: "",
  category: "",
  subcategory: "",
  sentiment: "",
  product: "",
  classification: "",
  alert_sent: "",
  employee_id: ""
};

const emptyResponse: ReviewsResponse = {
  items: [],
  total: 0,
  page: 1,
  limit: 25,
  total_pages: 1,
  metrics: {
    total: 0,
    abandonment: 0,
    retention: 0,
    alerts_sent: 0
  }
};

export function RecordsPanel({ options }: { options: CategoryOptions }) {
  const [records, setRecords] = useState<ReviewsResponse>(emptyResponse);
  const [draftFilters, setDraftFilters] = useState<RecordsFiltersState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<RecordsFiltersState>(emptyFilters);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<Review | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("sort_by", sortBy);
    params.set("sort_order", sortOrder);
    params.set("page", String(page));
    params.set("limit", String(limit));
    return `?${params.toString()}`;
  }, [appliedFilters, limit, page, sortBy, sortOrder]);

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await api.reviews(query));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los registros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [query]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    setPage(1);
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(key);
    setSortOrder("asc");
  };

  return (
    <section className="mx-auto grid w-full max-w-[1600px] gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Historial de predicciones</h2>
          <p className="mt-1 text-sm text-slate-500">Registros analizados, alertas generadas y seguimiento comercial.</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-900 transition hover:bg-blue-100"
          disabled={loading}
          onClick={loadRecords}
          type="button"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de registros" value={records.metrics.total} />
        <MetricCard label="Total de Abandono" tone="danger" value={records.metrics.abandonment} />
        <MetricCard label="Total de Retencion" tone="success" value={records.metrics.retention} />
        <MetricCard label="Alertas enviadas" tone="info" value={records.metrics.alerts_sent} />
      </div>

      <RecordsFilters
        filters={draftFilters}
        loading={loading}
        options={options}
        setFilters={setDraftFilters}
        onReset={resetFilters}
        onSubmit={handleSubmit}
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-bold text-slate-950">Registros encontrados</p>
            <p className="text-sm text-slate-500">
              {records.total.toLocaleString("es-MX")} resultados, pagina {records.page} de {records.total_pages}
            </p>
          </div>
          <label className="flex max-w-[180px] items-center gap-2 text-sm font-semibold text-slate-600">
            Mostrar
            <select
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <RecordsTable
          loading={loading}
          records={records.items}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSelect={setSelectedRecord}
          onSort={handleSort}
        />

        <Pagination
          loading={loading}
          page={records.page}
          totalPages={records.total_pages}
          onPageChange={setPage}
        />
      </div>

      <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </section>
  );
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "danger" | "success" | "info" }) {
  const tones = {
    neutral: "border-blue-100 bg-white text-blue-950",
    danger: "border-red-100 bg-red-50 text-red-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    info: "border-sky-100 bg-sky-50 text-sky-800"
  };

  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-3xl font-extrabold">{value.toLocaleString("es-MX")}</p>
    </div>
  );
}

function RecordsFilters({
  filters,
  loading,
  options,
  setFilters,
  onReset,
  onSubmit
}: {
  filters: RecordsFiltersState;
  loading: boolean;
  options: CategoryOptions;
  setFilters: (filters: RecordsFiltersState) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const update = (key: keyof RecordsFiltersState, value: string) => setFilters({ ...filters, [key]: value });

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-950">
        <Filter className="h-4 w-4 text-blue-700" />
        Filtros
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm font-semibold text-slate-700 xl:col-span-2">
          Busqueda global
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 rounded-lg border border-slate-200 pl-10 text-sm"
              placeholder="Comentario, cliente, producto, categoria..."
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
            />
          </div>
        </label>
        <FilterInput label="Fecha desde" type="date" value={filters.date_from} onChange={(value) => update("date_from", value)} />
        <FilterInput label="Fecha hasta" type="date" value={filters.date_to} onChange={(value) => update("date_to", value)} />
        <FilterSelect label="Categoria" options={options.categories} value={filters.category} onChange={(value) => update("category", value)} />
        <FilterSelect label="Subcategoria" options={options.subcategories} value={filters.subcategory} onChange={(value) => update("subcategory", value)} />
        <FilterSelect label="Sentimiento" options={options.sentiments} value={filters.sentiment} onChange={(value) => update("sentiment", value)} />
        <FilterSelect label="Producto" options={options.products} value={filters.product} onChange={(value) => update("product", value)} />
        <FilterSelect label="Clasificacion" options={options.classifications} value={filters.classification} onChange={(value) => update("classification", value)} />
        <FilterSelect
          label="Alerta enviada"
          options={[
            { label: "Si", value: "true" },
            { label: "No", value: "false" }
          ]}
          value={filters.alert_sent}
          onChange={(value) => update("alert_sent", value)}
        />
        <FilterSelect
          label="Empleado"
          options={(options.employees || []).map((employee) => ({ label: employee.name, value: String(employee.id) }))}
          value={filters.employee_id}
          onChange={(value) => update("employee_id", value)}
        />
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          disabled={loading}
          onClick={onReset}
          type="button"
        >
          Limpiar
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Filtrar
        </button>
      </div>
    </form>
  );
}

function FilterInput({ label, type = "text", value, onChange }: { label: string; type?: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 text-sm"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<string | { label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 bg-white text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos</option>
        {options.map((option) => {
          const valueOption = typeof option === "string" ? option : option.value;
          const labelOption = typeof option === "string" ? option : option.label;
          return <option key={valueOption} value={valueOption}>{labelOption}</option>;
        })}
      </select>
    </label>
  );
}

function RecordsTable({
  loading,
  records,
  sortBy,
  sortOrder,
  onSelect,
  onSort
}: {
  loading: boolean;
  records: Review[];
  sortBy: SortKey;
  sortOrder: SortOrder;
  onSelect: (record: Review) => void;
  onSort: (key: SortKey) => void;
}) {
  if (!loading && records.length === 0) {
    return (
      <div className="grid min-h-[280px] place-items-center p-8 text-center">
        <div>
          <p className="text-lg font-bold text-slate-950">Sin registros para mostrar</p>
          <p className="mt-2 max-w-md text-sm text-slate-500">Ajusta los filtros o carga nuevas predicciones para poblar el historial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      {loading && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/75">
          <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando registros
          </div>
        </div>
      )}
      <table className="min-w-[1560px] border-separate border-spacing-0 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <SortableHeader active={sortBy === "id"} label="ID" order={sortOrder} onClick={() => onSort("id")} />
            <SortableHeader active={sortBy === "date"} label="Fecha" order={sortOrder} onClick={() => onSort("date")} />
            <SortableHeader active={sortBy === "cliente"} label="Cliente" order={sortOrder} onClick={() => onSort("cliente")} />
            <SortableHeader active={sortBy === "comment"} label="Comentario" order={sortOrder} onClick={() => onSort("comment")} />
            <SortableHeader active={sortBy === "category"} label="Categoria" order={sortOrder} onClick={() => onSort("category")} />
            <SortableHeader active={sortBy === "subcategory"} label="Subcategoria" order={sortOrder} onClick={() => onSort("subcategory")} />
            <SortableHeader active={sortBy === "sentiment"} label="Sentimiento" order={sortOrder} onClick={() => onSort("sentiment")} />
            <SortableHeader active={sortBy === "product"} label="Producto" order={sortOrder} onClick={() => onSort("product")} />
            <SortableHeader active={sortBy === "predicted_classification"} label="Clasificacion predicha" order={sortOrder} onClick={() => onSort("predicted_classification")} />
            <SortableHeader active={sortBy === "prediction_confidence"} label="Probabilidad" order={sortOrder} onClick={() => onSort("prediction_confidence")} />
            <SortableHeader active={sortBy === "alert_sent"} label="Alerta enviada" order={sortOrder} onClick={() => onSort("alert_sent")} />
            <SortableHeader active={sortBy === "employee"} label="Empleado" order={sortOrder} onClick={() => onSort("employee")} />
            <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">Accion</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr className="group transition hover:bg-blue-50/45" key={record.id}>
              <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{record.id}</td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{formatDate(record.date || record.created_at)}</td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{record.external_id || "N/D"}</td>
              <td className="max-w-[360px] border-b border-slate-100 px-4 py-4 text-slate-700">
                <p className="line-clamp-2">{record.comment || "Sin comentario"}</p>
              </td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{record.category || "N/D"}</td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{record.subcategory || "N/D"}</td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{record.sentiment || "N/D"}</td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">{record.product || "N/D"}</td>
              <td className="border-b border-slate-100 px-4 py-4"><StatusBadge value={record.predicted_classification} /></td>
              <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-800">{formatPercent(record.prediction_confidence)}</td>
              <td className="border-b border-slate-100 px-4 py-4"><AlertBadge sent={record.alert_sent} /></td>
              <td className="border-b border-slate-100 px-4 py-4 text-slate-700">
                <div className="grid gap-1">
                  <span>{record.employee_name || "N/D"}</span>
                  {record.employee_email && <span className="text-xs text-slate-400">{record.employee_email}</span>}
                </div>
              </td>
              <td className="border-b border-slate-100 px-4 py-4">
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
                  onClick={() => onSelect(record)}
                  type="button"
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({ active, label, order, onClick }: { active: boolean; label: string; order: SortOrder; onClick: () => void }) {
  return (
    <th className="border-b border-slate-200 px-4 py-3 text-left">
      <button
        className={`inline-flex items-center gap-2 text-xs font-bold uppercase transition ${
          active ? "text-blue-800" : "text-slate-500 hover:text-slate-900"
        }`}
        onClick={onClick}
        type="button"
      >
        {label}
        {active ? (
          order === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUp className="h-3.5 w-3.5 opacity-30" />
        )}
      </button>
    </th>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  const normalized = (value || "").toLowerCase();
  const isAbandonment = normalized.includes("abandono");
  const isRetention = normalized.includes("retenc");
  const classes = isAbandonment
    ? "border-red-200 bg-red-50 text-red-700"
    : isRetention
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>
      {value || "N/D"}
    </span>
  );
}

function AlertBadge({ sent }: { sent: boolean }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
      sent ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-500"
    }`}>
      {sent ? "Si" : "No"}
    </span>
  );
}

function Pagination({
  loading,
  page,
  totalPages,
  onPageChange
}: {
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const canPrevious = page > 1;
  const canNext = page < totalPages;
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages])).filter((value) => value >= 1 && value <= totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">Pagina {page} de {totalPages}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canPrevious || loading}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        {pages.map((pageNumber) => (
          <button
            className={`h-10 min-w-10 rounded-lg border px-3 text-sm font-bold ${
              pageNumber === page ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700"
            }`}
            disabled={loading}
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            type="button"
          >
            {pageNumber}
          </button>
        ))}
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canNext || loading}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RecordDetailModal({ record, onClose }: { record: Review | null; onClose: () => void }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-sm font-semibold uppercase text-blue-700">Detalle del registro</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-950">Registro #{record.id}</h3>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
            aria-label="Cerrar detalle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            <StatusBadge value={record.predicted_classification} />
            <AlertBadge sent={record.alert_sent} />
            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
              {formatPercent(record.prediction_confidence)}
            </span>
          </div>

          <DetailSection title="Comentario completo">
            <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
              {record.comment || "Sin comentario"}
            </p>
          </DetailSection>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <DetailItem label="ID del registro" value={String(record.id)} />
            <DetailItem label="Cliente o ID del cliente" value={record.external_id || "N/D"} />
            <DetailItem label="Categoria" value={record.category || "N/D"} />
            <DetailItem label="Subcategoria" value={record.subcategory || "N/D"} />
            <DetailItem label="Sentimiento" value={record.sentiment || "N/D"} />
            <DetailItem label="Producto" value={record.product || "N/D"} />
            <DetailItem label="Clasificacion original" value={record.original_classification || "N/D"} />
            <DetailItem label="Clasificacion predicha" value={record.predicted_classification || "N/D"} />
            <DetailItem label="Probabilidad/confianza" value={formatPercent(record.prediction_confidence)} />
            <DetailItem label="Alerta enviada" value={record.alert_sent ? "Si" : "No"} />
            <DetailItem label="Fecha de alerta" value={record.alert_sent_at ? formatDateTime(record.alert_sent_at) : "N/D"} />
            <DetailItem label="Empleado" value={record.employee_name || "N/D"} />
            <DetailItem label="Correo del empleado" value={record.employee_email || "N/D"} />
            <DetailItem label="Fecha de creacion" value={formatDateTime(record.created_at)} />
          </div>

          <DetailSection title="Detalle adicional">
            <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {record.detail || "Sin detalle adicional"}
            </p>
          </DetailSection>

          <DetailSection title="Recomendacion comercial sugerida">
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-950">
              {recommendationFor(record)}
            </p>
          </DetailSection>
        </div>
        <div className="border-t border-slate-200 p-5">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mt-5">
      <p className="mb-2 text-sm font-bold text-slate-950">{title}</p>
      {children}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/D";
  return `${(value * 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatDate(value: string | null) {
  if (!value) return "N/D";
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string | null) {
  if (!value) return "N/D";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function recommendationFor(record: Review) {
  const classification = (record.predicted_classification || "").toLowerCase();
  if (classification.includes("abandono") || (record.prediction_confidence !== null && record.prediction_confidence >= 0.5)) {
    return "Contactar al cliente de forma prioritaria, identificar la causa del riesgo y activar un plan de retencion con seguimiento comercial.";
  }
  return "Mantener seguimiento preventivo, reforzar los puntos positivos detectados y programar comunicacion de continuidad con el cliente.";
}
