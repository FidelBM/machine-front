"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BarChart3,
  FileUp,
  ListFilter,
  LogOut,
  MailCheck,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users
} from "lucide-react";

import { api, CategoryOptions, clearToken, DashboardSummary, Employee, getToken } from "@/lib/api";
import { EmployeeAdmin, EmployeeFormState, EmployeeUpdatePayload } from "@/components/EmployeeAdmin";
import { RecordsPanel } from "@/components/RecordsPanel";

type View = "dashboard" | "upload" | "analysis" | "records" | "settings" | "employees";
type AnalysisForm = {
  customer_id: string;
  customer_name: string;
  comentario: string;
  categoria: string;
  subcategoria: string;
  sentimiento: string;
  producto: string;
  detalle: string;
};
type PredictionResult = {
  predicted_classification: string;
  prediction_confidence: number | null;
  recommendation: string;
  alert_sent: boolean;
  alert_error: string | null;
};

const emptySummary: DashboardSummary = {
  total_reviews: 0,
  high_churn_intent: 0,
  likely_retention: 0,
  by_category: [],
  by_subcategory: [],
  trend: []
};

const emptyOptions: CategoryOptions = {
  categories: [],
  subcategories: [],
  sentiments: [],
  products: [],
  classifications: [],
  employees: []
};

const palette = ["#1558a8", "#1d6ed0", "#38a3d1", "#42b883", "#f59e0b", "#64748b"];
export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>("dashboard");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [options, setOptions] = useState<CategoryOptions>(emptyOptions);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [analysisForm, setAnalysisForm] = useState<AnalysisForm>({
    customer_id: "",
    customer_name: "",
    comentario: "",
    categoria: "",
    subcategoria: "",
    sentimiento: "",
    producto: "",
    detalle: ""
  });
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({ name: "", email: "", password: "", role: "analyst" });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const loadSummary = async () => {
    const [summaryData, categoryData] = await Promise.all([api.summary(), api.categories()]);
    setSummary(summaryData);
    setOptions(categoryData);
  };

  const loadEmployees = async () => {
    setEmployeeList(await api.employees());
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((currentEmployee) => {
        setEmployee(currentEmployee);
        return loadSummary();
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (view === "employees" && employee?.role === "admin") {
      loadEmployees().catch((error) => setStatus(error.message));
    }
  }, [view, employee]);

  const title = useMemo(() => {
    if (view === "dashboard") return "Dashboard general";
    if (view === "upload") return "Carga de CSV";
    if (view === "analysis") return "Analisis individual";
    if (view === "records") return "Registros";
    if (view === "settings") return "Configuracion";
    return "Empleados";
  }, [view]);

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus("");
    try {
      const result = await api.uploadCsv(file);
      const warning = result.prediction_warnings.length ? ` Advertencia: ${result.prediction_warnings[0]}` : "";
      const details = result.error_details.length ? ` Primeros errores: ${result.error_details.join(" | ")}` : "";
      setStatus(`Insertados: ${result.inserted}. Duplicados omitidos: ${result.skipped}. Errores: ${result.errors}.${warning}${details}`);
      await loadSummary();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cargar el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setPrediction(null);
    setStatus("");
    try {
      setPrediction(await api.predict(analysisForm));
      await loadSummary();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo generar la prediccion.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await api.registerEmployee(employeeForm);
      setEmployeeForm({ name: "", email: "", password: "", role: "analyst" });
      setStatus("Empleado creado correctamente. Ya puede iniciar sesion.");
      await loadEmployees();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    setLoading(true);
    setStatus("");
    try {
      await api.deleteEmployee(employeeId);
      setStatus("Empleado eliminado correctamente.");
      await loadEmployees();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (employeeId: number, payload: EmployeeUpdatePayload) => {
    setLoading(true);
    setStatus("");
    try {
      await api.updateEmployee(employeeId, payload);
      setStatus("Empleado actualizado correctamente.");
      await loadEmployees();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar empleado.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      await api.changePassword(passwordForm);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      clearToken();
      router.replace("/login");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cambiar la contrasena.");
    } finally {
      setLoading(false);
    }
  };

  if (!employee) {
    return <main className="main"><p className="muted">Validando sesion...</p></main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">ELEMENT ELITE FLEET</div>
        <nav className="nav" aria-label="Navegacion principal">
          <NavButton active={view === "dashboard"} icon={<BarChart3 size={18} />} onClick={() => setView("dashboard")}>Dashboard</NavButton>
          <NavButton active={view === "upload"} icon={<FileUp size={18} />} onClick={() => setView("upload")}>Cargar CSV</NavButton>
          <NavButton active={view === "analysis"} icon={<Sparkles size={18} />} onClick={() => setView("analysis")}>Analisis</NavButton>
          <NavButton active={view === "records"} icon={<ListFilter size={18} />} onClick={() => setView("records")}>Registros</NavButton>
          <NavButton active={view === "settings"} icon={<Settings size={18} />} onClick={() => setView("settings")}>Configuracion</NavButton>
          {employee.role === "admin" && (
            <NavButton active={view === "employees"} icon={<Users size={18} />} onClick={() => setView("employees")}>Empleados</NavButton>
          )}
        </nav>
        <div className="sidebar-user">
          <p>{employee.name}</p>
          <span>{employee.role}</span>
          <button className="logout-button" onClick={logout} type="button">
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Inteligencia comercial</p>
            <h1>{title}</h1>
          </div>
          <button className="button secondary" onClick={() => loadSummary()} type="button">
            <ShieldCheck size={18} />
            Actualizar
          </button>
        </header>

        {view === "dashboard" && <Dashboard summary={summary} />}
        {view === "upload" && <UploadPanel loading={loading} onUpload={handleUpload} status={status} />}
        {view === "analysis" && (
          <AnalysisPanel
            form={analysisForm}
            loading={loading}
            options={options}
            prediction={prediction}
            setForm={setAnalysisForm}
            status={status}
            onSubmit={handlePredict}
          />
        )}
        {view === "records" && <RecordsPanel options={options} />}
        {view === "settings" && (
          <SettingsPanel
            employee={employee}
            form={passwordForm}
            loading={loading}
            setForm={setPasswordForm}
            status={status}
            onSubmit={handleChangePassword}
          />
        )}
        {view === "employees" && employee.role === "admin" && (
          <EmployeeAdmin
            currentEmployee={employee}
            employees={employeeList}
            form={employeeForm}
            loading={loading}
            setForm={setEmployeeForm}
            status={status}
            onCreate={handleCreateEmployee}
            onDelete={handleDeleteEmployee}
            onRefresh={loadEmployees}
            onUpdate={handleUpdateEmployee}
          />
        )}
      </main>
    </div>
  );
}

function NavButton({ active, children, icon, onClick }: { active: boolean; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick} type="button">{icon}{children}</button>;
}

function Dashboard({ summary }: { summary: DashboardSummary }) {
  return (
    <>
      <section className="grid stats">
        <Metric title="Resenas analizadas" value={summary.total_reviews} />
        <Metric title="Alta intencion de abandono" value={summary.high_churn_intent} />
        <Metric title="Retencion probable" value={summary.likely_retention} />
      </section>
      <section className="grid charts">
        <div className="card">
          <p className="card-title">Tendencia por mes o trimestre</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={summary.trend}>
              <CartesianGrid stroke="#dbe4f0" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1558a8" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <p className="card-title">Distribucion por categoria</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={summary.by_category} dataKey="value" nameKey="name" outerRadius={96} label>
                {summary.by_category.map((_, index) => <Cell fill={palette[index % palette.length]} key={index} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card full">
          <p className="card-title">Distribucion por subcategoria</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={summary.by_subcategory.slice(0, 18)}>
              <CartesianGrid stroke="#dbe4f0" />
              <XAxis dataKey="name" interval={0} angle={-20} height={90} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1d6ed0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div className="card"><p className="card-title">{title}</p><div className="metric">{value.toLocaleString("es-MX")}</div></div>;
}

function UploadPanel({ loading, onUpload, status }: { loading: boolean; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; status: string }) {
  return (
    <section className="card">
      <p className="card-title">Archivo con estructura de clasificacion_comentarios.csv</p>
      <label>CSV de comentarios<input accept=".csv,text/csv" disabled={loading} onChange={onUpload} type="file" /></label>
      <p className="muted">Se validan las columnas requeridas y se omiten duplicados cuando el campo ID ya existe.</p>
      {status && <p className="status">{status}</p>}
    </section>
  );
}

function AnalysisPanel({
  form,
  loading,
  options,
  prediction,
  setForm,
  status,
  onSubmit
}: {
  form: AnalysisForm;
  loading: boolean;
  options: CategoryOptions;
  prediction: PredictionResult | null;
  setForm: (value: AnalysisForm) => void;
  status: string;
  onSubmit: (event: FormEvent) => void;
}) {
  const update = (key: keyof AnalysisForm, value: string) => setForm({ ...form, [key]: value });
  return (
    <section className="grid charts">
      <form className="card form-grid" onSubmit={onSubmit}>
        <label>ID del cliente<input value={form.customer_id} onChange={(event) => update("customer_id", event.target.value)} /></label>
        <label>Nombre del cliente<input value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} /></label>
        <label className="full">Comentario<textarea required value={form.comentario} onChange={(event) => update("comentario", event.target.value)} /></label>
        <Field label="Categoria" options={options.categories} value={form.categoria} onChange={(value) => update("categoria", value)} />
        <Field label="Subcategoria" options={options.subcategories} value={form.subcategoria} onChange={(value) => update("subcategoria", value)} />
        <Field label="Sentimiento" options={options.sentiments} value={form.sentimiento} onChange={(value) => update("sentimiento", value)} />
        <Field label="Producto" options={options.products} value={form.producto} onChange={(value) => update("producto", value)} />
        <label className="full">Detalle<textarea value={form.detalle} onChange={(event) => update("detalle", event.target.value)} /></label>
        <button className="button" disabled={loading} type="submit"><UserCheck size={18} />Generar prediccion</button>
      </form>
      <div className="card">
        <p className="card-title">Resultado</p>
        {prediction ? (
          <>
            <span className="pill">{prediction.predicted_classification}</span>
            <p className="metric">{prediction.prediction_confidence === null ? "N/D" : `${Math.round(prediction.prediction_confidence * 100)}%`}</p>
            <p className="muted">Probabilidad del resultado</p>
            <p>{prediction.recommendation}</p>
            <p className={prediction.alert_sent ? "status success" : "status"}>
              <MailCheck size={16} />
              {prediction.alert_sent
                ? "Email de alerta enviado al empleado autenticado."
                : prediction.alert_error || "No se envio alerta porque el resultado fue Retencion."}
            </p>
          </>
        ) : (
          <p className="muted">Completa el comentario para obtener Abandono o Retencion, probabilidad y recomendacion comercial.</p>
        )}
        {status && <p className="status error">{status}</p>}
      </div>
    </section>
  );
}

function Field({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input list={`${label}-options`} required={label === "Categoria" || label === "Subcategoria"} value={value} onChange={(event) => onChange(event.target.value)} />
      <datalist id={`${label}-options`}>{options.map((option) => <option key={option} value={option} />)}</datalist>
    </label>
  );
}

function SettingsPanel({
  employee,
  form,
  loading,
  setForm,
  status,
  onSubmit
}: {
  employee: Employee;
  form: { current_password: string; new_password: string; confirm_password: string };
  loading: boolean;
  setForm: (value: { current_password: string; new_password: string; confirm_password: string }) => void;
  status: string;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <section className="grid charts">
      <div className="card">
        <p className="card-title">Empleado autenticado</p>
        <div className="profile-grid">
          <div><span className="muted">Nombre</span><strong>{employee.name}</strong></div>
          <div><span className="muted">Correo</span><strong>{employee.email}</strong></div>
          <div><span className="muted">Rol</span><strong>{employee.role}</strong></div>
        </div>
      </div>
      <form className="card form-grid" onSubmit={onSubmit}>
        <p className="card-title full">Cambiar contrasena</p>
        <label className="full">
          Contrasena actual
          <input
            required
            type="password"
            value={form.current_password}
            onChange={(event) => setForm({ ...form, current_password: event.target.value })}
          />
        </label>
        <label>
          Nueva contrasena
          <input
            minLength={8}
            required
            type="password"
            value={form.new_password}
            onChange={(event) => setForm({ ...form, new_password: event.target.value })}
          />
        </label>
        <label>
          Confirmar nueva contrasena
          <input
            minLength={8}
            required
            type="password"
            value={form.confirm_password}
            onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
          />
        </label>
        <button className="button" disabled={loading} type="submit"><Save size={18} />Guardar cambio</button>
        {status && <p className="status error full">{status}</p>}
      </form>
    </section>
  );
}
