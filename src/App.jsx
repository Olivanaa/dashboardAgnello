import { useState, useEffect } from 'react'
import Plot from 'react-plotly.js';
import axios from 'axios';
import moment from 'moment-timezone';

const IP_ADDRESS = "107.23.174.107";
const PORT_STH = 8666;
const FIWARE_SVC = "smart";
const FIWARE_SSP = "/";
const ENTITY_ID = "urn:ngsi-ld:device007";
const TEMP = "temperatura";
const UMID = "umidade";
const LUMI = "luminosidade";
const LAST_N = 20;
const MAX_POINTS = 500;
const REFRESH_MS = 5000;

const TZ_SP = "America/Sao_Paulo"

const LIMITS = {
  temp: { min: 10, max: 18 },
  umid: { min: 50, max: 70 },
  lumi: { min: 60, max: 100 }
}

function App() {
  const [temp, setTemp] = useState({ ts: [], y: [] });
  const [umid, setUmid] = useState({ ts: [], y: [] });
  const [lumi, setLumi] = useState({ ts: [], y: [] });
  const [tempStatus, setTempStatus] = useState("Aguardando dados");
  const [umidStatus, setUmidStatus] = useState("Aguardando dados");
  const [lumiStatus, setLumiStatus] = useState("Aguardando dados");
  const [bannerMessages, setBannerMessages] = useState(["—"]);
  const [bannerIndex, setBannerIndex] = useState(0);

  const convertData = (values) => {
    return values.map((e) => ({
      ts: e.recvTime,
      val: parseFloat(e.attrValue)
    }))
  }

   const updateData = (prev, batch) => {
    const seen = new Set(prev.ts);
    const newData = [...prev.ts];
    const newVals = [...prev.y];

    for (let { ts, val } of batch) {
      if (!seen.has(ts)) {
        newData.push(ts);
        newVals.push(val);
        seen.add(ts);
      }
    }

    const combined = newData.map((ts, i) => ({ ts, y: newVals[i] }));
    const trimmed = combined.slice(-MAX_POINTS);
    return {
      ts: trimmed.map((p) => p.ts),
      y: trimmed.map((p) => p.y),
    };
  }; 

  async function fecthData() {
    try {
      const urlBase = `/STH/v1/contextEntities/type/device/id/${ENTITY_ID}/attributes`;
      const headers = {
        "fiware-service": FIWARE_SVC,
        "fiware-servicepath": FIWARE_SSP,
      }

      const [tempRes, umidRes, lumiRes] = await Promise.all([
        axios.get(`${urlBase}/${TEMP}?lastN=${LAST_N}`, { headers }),
        axios.get(`${urlBase}/${UMID}?lastN=${LAST_N}`, { headers }),
        axios.get(`${urlBase}/${LUMI}?lastN=${LAST_N}`, { headers })
      ])

      const tempVals = tempRes.data.contextResponses[0].contextElement.attributes[0].values
      const umidVals = umidRes.data.contextResponses[0].contextElement.attributes[0].values
      const lumiVals = lumiRes.data.contextResponses[0].contextElement.attributes[0].values

      setTemp((prev) => updateData(prev, convertData(tempVals)));
      setUmid((prev) => updateData(prev, convertData(umidVals)));
      setLumi((prev) => updateData(prev, convertData(lumiVals)));

    } catch (erro) {
      console.warn(erro.message);
    }
  }
  console.log(temp);
  
  

  useEffect(() => {
    fecthData()
    const id = setInterval(fecthData, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!temp.ts.length || !umid.ts.length || !lumi.ts.length) return

    let messages = []
    let hasError = false

    const tempLastVal = temp.y[temp.y.length - 1]
    const umidLastVal = umid.y[umid.y.length - 1]
    const lumiLastVal = lumi.y[lumi.y.length - 1]

    if (tempLastVal > LIMITS.temp.max) {
      setTempStatus("Temperatura Alta")
      messages.push("⚠️ Alerta: Temperatura acima do limite seguro para os vinhos!")
      hasError = true
    } else if (tempLastVal < LIMITS.temp.min) {
      setTempStatus("Temperatura Baixa")
      messages.push("⚠️ Alerta: Temperatura abaixo do ideal para conservação!")
      hasError = true
    } else {
      setTempStatus("Temperatura OK")
    }

    if (umidLastVal > LIMITS.umid.max) {
      setUmidStatus("Umidade Alta")
      messages.push("⚠️  Alerta: Umidade elevada pode danificar os rótulos!")
      hasError = true
    } else if (umidLastVal < LIMITS.umid.min) {
      setUmidStatus("Umidade Baixa")
      messages.push("⚠️  Alerta: Umidade muito baixa pode ressecar as rolhas!")
      hasError = true
    } else {
      setUmidStatus("Umidade OK")
    }

    if (lumiLastVal > LIMITS.lumi.max) {
      setLumiStatus("Ambiente muito claro")
      messages.push("⚠️  Alerta: Luminosidade excessiva pode deteriorar os vinhos!")
      hasError = true
    } else if (lumiLastVal < LIMITS.lumi.min) {
      setLumiStatus("Ambiente escuro")
      messages.push("⚠️  Alerta: Luminosidade insuficiente para monitoramento!")
      hasError = true
    } else {
      setLumiStatus("Luminosidade OK")
    }

    if (!hasError && messages.length === 0) {
      messages.push("✅ Sistema Operando Normalmente - Todos os sensores dentro dos parâmetros ideais")
    }

    setBannerMessages(messages)

  }, [temp, umid, lumi])

  useEffect(() => {
    if (bannerMessages.length === 0) return;

    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerMessages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [bannerMessages]);

  return (
    <div className="min-h-screen bg-[#FDF6F0] flex flex-col items-center p-4 md:p-6 space-y-6 md:space-y-8">

      {/* Header */}
      <header className="flex flex-col items-center p-4 md:p-6 space-y-6 md:space-y-8">
        <h1 className="text-6xl md:text-7xl font-extrabold text-[#8B0000] mb-2">Vinheria Agnello 🍷</h1>
        <p className="text-gray-600 text-lg md:text-xl font-light">
          Excelência na conservação de vinhos 
        </p>
      </header>

      {/* Container Principal */}
      <div className="w-full max-w-7xl bg-white/90 backdrop-blur-sm rounded-2xl flex flex-col justify-center items-center p-4 md:p-8 space-y-6 md:space-y-8 shadow-xl border border-white/20">
        <div className="text-center w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Painel de Operação - Adega Premium
          </h2>
          <h3 className="text-lg md:text-xl text-gray-600 font-light">
            Monitoramento contínuo dos sensores DHT11 e LDR
          </h3>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl">
          {[
            {
              title: "Temperatura",
              value: temp.y[temp.y.length - 1] ?? "--",
              unit: "°C",
              status: tempStatus,
              icon: "🌡️",
            },
            {
              title: "Umidade",
              value: umid.y[umid.y.length - 1] ?? "--",
              unit: "%",
              status: umidStatus,
              icon: "💧",
            },
            {
              title: "Luminosidade",
              value: lumi.y[lumi.y.length - 1] ?? "--",
              unit: "lx",
              status: lumiStatus,
              icon: "🔆",
            }
          ].map((sensor, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-2xl p-6 flex flex-col justify-center items-center shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className={`text-3xl mb-3`}>
                {sensor.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{sensor.title}</h3>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                {sensor.value} <span className="text-2xl text-gray-600">{sensor.unit}</span>
              </p>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${sensor.status.includes("OK")
                ? "bg-green-100 text-green-800"
                : sensor.status.includes("Alta") || sensor.status.includes("muito")
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
                }`}>
                {sensor.status}
              </div>
            </div>
          ))}
        </div>

        {/* Banner */}
        <div
          className={`w-full max-w-6xl text-center py-4 rounded-lg font-semibold text-lg ${bannerMessages[bannerIndex].includes("⚠️")
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"
            }`}
        >
          {bannerMessages[bannerIndex]}
        </div>

        {/* Gráficos */}
        <div className="w-full max-w-6xl space-y-8">

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <Plot
              data={[
                {
                  x: temp.ts.map(ts => moment(ts).tz(TZ_SP).format("DD/MM HH:mm")),
                  y: temp.y,
                  type: 'scatter',
                  mode: 'lines+markers',
                  line: {
                    color: '#DC2626',
                    width: 3,
                    shape: 'spline'
                  },
                  marker: {
                    color: '#DC2626',
                    size: 6,
                    line: { color: 'white', width: 1 }
                  },
                  name: 'Temperatura',
                },
              ]}
              layout={{
                title: {
                  text: '🌡️ Temperatura (°C)',
                  font: { size: 20, family: 'Inter, sans-serif' },
                  x: 0.02,
                },
                xaxis: {
                  title: 'Data e Hora',
                  gridcolor: '#f1f5f9',
                  tickangle: -45,
                  type: 'category'
                },
                yaxis: {
                  title: '°C',
                  gridcolor: '#f1f5f9',
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#374151', family: 'Inter, sans-serif' },
                margin: { t: 50, l: 60, r: 40, b: 80 },
                hovermode: 'closest',
                showlegend: false,
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              }}
              style={{ width: "100%", height: "400px" }}
            />
          </div>


          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <Plot
              data={[
                {
                  x: umid.ts.map(ts => moment(ts).tz(TZ_SP).format("DD/MM HH:mm")),
                  y: umid.y,
                  type: 'scatter',
                  mode: 'lines+markers',
                  line: {
                    color: '#2563EB',
                    width: 3,
                    shape: 'spline'
                  },
                  marker: {
                    color: '#2563EB',
                    size: 6,
                    line: { color: 'white', width: 1 }
                  },
                  name: 'Umidade',
                },
              ]}
              layout={{
                title: {
                  text: '💧 Umidade (%)',
                  font: { size: 20, family: 'Inter, sans-serif' },
                  x: 0.02,
                },
                xaxis: {
                  title: 'Data e Hora',
                  gridcolor: '#f1f5f9',
                  tickangle: -45,
                  type: 'category'
                },
                yaxis: {
                  title: '%',
                  gridcolor: '#f1f5f9',
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#374151', family: 'Inter, sans-serif' },
                margin: { t: 50, l: 60, r: 40, b: 80 },
                hovermode: 'closest',
                showlegend: false,
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              }}
              style={{ width: "100%", height: "400px" }}
            />
          </div>


          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <Plot
              data={[
                {
                  x: lumi.ts.map(ts => moment(ts).tz(TZ_SP).format("DD/MM HH:mm")),
                  y: lumi.y,
                  type: 'scatter',
                  mode: 'lines+markers',
                  line: {
                    color: '#D97706',
                    width: 3,
                    shape: 'spline'
                  },
                  marker: {
                    color: '#D97706',
                    size: 6,
                    line: { color: 'white', width: 1 }
                  },
                  name: 'Luminosidade',
                },
              ]}
              layout={{
                title: {
                  text: '🔆 Luminosidade (lx)',
                  font: { size: 20, family: 'Inter, sans-serif' },
                  x: 0.02,
                },
                xaxis: {
                  title: 'Data e Hora',
                  gridcolor: '#f1f5f9',
                  tickangle: -45,
                  type: 'category'
                },
                yaxis: {
                  title: 'lx',
                  gridcolor: '#f1f5f9',
                },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#374151', family: 'Inter, sans-serif' },
                margin: { t: 50, l: 60, r: 40, b: 80 },
                hovermode: 'closest',
                showlegend: false,
              }}
              config={{
                responsive: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              }}
              style={{ width: "100%", height: "400px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-4">
          <p className="mt-1">Sistema de Monitoramento Vinheria Agnello • Todos os direitos reservados</p>
        </div>

      </div>
    </div>
  )
}

export default App