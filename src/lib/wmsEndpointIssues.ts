export type KnownEndpointStatus = "offline" | "tls_error";

export interface KnownEndpointIssue {
  status: KnownEndpointStatus;
  message: string;
}

const KNOWN_ENDPOINT_ISSUES: Array<{ match: string; issue: KnownEndpointIssue }> = [
  {
    match: "https://www.pcn.minambiente.it/arcgis/rest/services/Rischio_beni_esposti/MapServer",
    issue: { status: "offline", message: "Servizio PCN non pubblico o instabile: risponde con HTML 503 invece che con dati GIS." },
  },
  {
    match: "https://geoportale.regione.calabria.it/arcgis/rest/services/PAI/PAI_pericolosita/MapServer",
    issue: { status: "offline", message: "Endpoint Calabria non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://rsdi.regione.basilicata.it/arcgis/rest/services/PAI/PAI_Pericolosita/MapServer",
    issue: { status: "offline", message: "Endpoint Basilicata non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://www502.regione.toscana.it/arcgis/rest/services/paesaggio/vincoli_paesaggistici/MapServer",
    issue: { status: "offline", message: "Endpoint Toscana reindirizza alla home HTML e non espone un servizio GIS pubblico." },
  },
  {
    match: "https://idt2.regione.veneto.it/arcgis/rest/services/Difesa_suolo/PAI_pericolosita/MapServer",
    issue: { status: "offline", message: "Endpoint Veneto non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://geoportale.regione.lazio.it/arcgis/rest/services/Paesaggio/PTPR_Tavole_A/MapServer",
    issue: { status: "offline", message: "Endpoint Lazio non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://sit2.regione.campania.it/arcgis/rest/services/Difesa_suolo/PAI_Pericolosita/MapServer",
    issue: { status: "offline", message: "Endpoint Campania richiede autenticazione e non è utilizzabile come servizio pubblico." },
  },
  {
    match: "https://www.sitr.regione.sicilia.it/arcgis/rest/services/PAI/PAI_Pericolosita_Geomorfologica/MapServer",
    issue: { status: "offline", message: "Endpoint Sicilia non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://sit.regione.molise.it/arcgis/rest/services/PAI/PAI_Pericolosita/MapServer",
    issue: { status: "offline", message: "Dominio Molise non risolve correttamente via DNS." },
  },
  {
    match: "https://geomap.reteunitaria.piemonte.it/arcgis/rest/services/Paesaggio/PPR_componenti/MapServer",
    issue: { status: "offline", message: "Endpoint Piemonte restituisce una risposta 404 non GIS." },
  },
  {
    match: "https://webgis2.regione.sardegna.it/arcgis/rest/services/PPR/PPR_ambiti/MapServer",
    issue: { status: "offline", message: "Endpoint Sardegna non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://servizimoka.regione.emilia-romagna.it/arcgis/rest/services/Paesaggio/PTPR/MapServer",
    issue: { status: "offline", message: "Endpoint Emilia-Romagna restituisce HTML e non dati GIS." },
  },
  {
    match: "https://siat.provincia.tn.it/arcgis/rest/services/PUP/PUP_Urbanistica/MapServer",
    issue: { status: "offline", message: "Endpoint Trento non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://irdat.regione.fvg.it/arcgis/rest/services/Paesaggio/PPR/MapServer",
    issue: { status: "offline", message: "Endpoint Friuli Venezia Giulia non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://mappe.regione.vda.it/arcgis/rest/services/PTP/PTP_Componenti/MapServer",
    issue: { status: "offline", message: "Endpoint Valle d'Aosta non pubblico: risponde con pagina HTML 404." },
  },
  {
    match: "https://www.umbriageo.regione.umbria.it/arcgis/rest/services/Paesaggio/PPR/MapServer",
    issue: { status: "tls_error", message: "Il server Umbria ha un certificato TLS non valido; abilita il bypass TLS per usarlo." },
  },
  {
    match: "https://sitr.regione.marche.it/arcgis/rest/services/Paesaggio/PPAR/MapServer",
    issue: { status: "offline", message: "Dominio Marche non risolve correttamente via DNS." },
  },
  {
    match: "https://srvcarto.regione.liguria.it/arcgis/rest/services/Paesaggio/PTCP/MapServer",
    issue: { status: "offline", message: "Endpoint Liguria non pubblico: risponde con pagina HTML 404." },
  },
];

export function getEndpointKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].replace(/\/+$/, "");
  }
}

export function getEndpointHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function getKnownEndpointIssue(url?: string | null): KnownEndpointIssue | null {
  if (!url) return null;
  const key = getEndpointKey(url);
  const match = KNOWN_ENDPOINT_ISSUES.find((entry) => getEndpointKey(entry.match) === key);
  return match?.issue ?? null;
}