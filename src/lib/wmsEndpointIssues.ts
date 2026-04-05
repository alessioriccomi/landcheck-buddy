export type KnownEndpointStatus = "offline" | "tls_error";

export interface KnownEndpointIssue {
  status: KnownEndpointStatus;
  message: string;
}

// Hosts that are entirely offline — every service on them fails
const KNOWN_OFFLINE_HOSTS: Array<{ host: string; issue: KnownEndpointIssue }> = [
  { host: "www.pcn.minambiente.it", issue: { status: "offline", message: "Servizio PCN non pubblico o instabile: risponde con HTML 503 invece che con dati GIS." } },
  { host: "wms.pcn.minambiente.it", issue: { status: "offline", message: "Servizio WMS PCN non disponibile: risponde con errore HTTP 500." } },
  { host: "geoportale.regione.calabria.it", issue: { status: "offline", message: "Endpoint Calabria non pubblico: risponde con pagina HTML 404." } },
  { host: "rsdi.regione.basilicata.it", issue: { status: "offline", message: "Endpoint Basilicata non pubblico: risponde con pagina HTML 404." } },
  { host: "www502.regione.toscana.it", issue: { status: "offline", message: "Endpoint Toscana reindirizza alla home HTML e non espone un servizio GIS pubblico." } },
  { host: "idt2.regione.veneto.it", issue: { status: "offline", message: "Endpoint Veneto non pubblico: risponde con pagina HTML 404." } },
  { host: "geoportale.regione.lazio.it", issue: { status: "offline", message: "Endpoint Lazio non pubblico: risponde con pagina HTML 404." } },
  { host: "sit2.regione.campania.it", issue: { status: "offline", message: "Endpoint Campania richiede autenticazione e non è utilizzabile come servizio pubblico." } },
  { host: "www.sitr.regione.sicilia.it", issue: { status: "offline", message: "Endpoint Sicilia non pubblico: risponde con pagina HTML 404." } },
  { host: "sit.regione.molise.it", issue: { status: "offline", message: "Dominio Molise non risolve correttamente via DNS." } },
  { host: "geomap.reteunitaria.piemonte.it", issue: { status: "offline", message: "Endpoint Piemonte restituisce una risposta 404 non GIS." } },
  { host: "webgis2.regione.sardegna.it", issue: { status: "offline", message: "Endpoint Sardegna non pubblico: risponde con pagina HTML 404." } },
  { host: "servizimoka.regione.emilia-romagna.it", issue: { status: "offline", message: "Endpoint Emilia-Romagna restituisce HTML e non dati GIS." } },
  { host: "siat.provincia.tn.it", issue: { status: "offline", message: "Endpoint Trento non pubblico: risponde con pagina HTML 404." } },
  { host: "irdat.regione.fvg.it", issue: { status: "offline", message: "Endpoint Friuli Venezia Giulia non pubblico: risponde con pagina HTML 404." } },
  { host: "mappe.regione.vda.it", issue: { status: "offline", message: "Endpoint Valle d'Aosta non pubblico: risponde con pagina HTML 404." } },
  { host: "sitr.regione.marche.it", issue: { status: "offline", message: "Dominio Marche non risolve correttamente via DNS." } },
  { host: "srvcarto.regione.liguria.it", issue: { status: "offline", message: "Endpoint Liguria non pubblico: risponde con pagina HTML 404." } },
  { host: "geoportale.regione.abruzzo.it", issue: { status: "offline", message: "Endpoint Abruzzo non pubblico o non in allowlist." } },
  { host: "www.umbriageo.regione.umbria.it", issue: { status: "tls_error", message: "Il server Umbria ha un certificato TLS non valido; abilita il bypass TLS per usarlo." } },
  { host: "wms.cartografia.agenziaentrate.gov.it", issue: { status: "offline", message: "Servizio WMS Catasto (Inspire) non disponibile: risponde con errore HTTP 500." } },
  { host: "gis.snam.it", issue: { status: "offline", message: "Dominio SNAM non risolve via DNS: servizio non raggiungibile." } },
  { host: "gnac.beniculturali.it", issue: { status: "offline", message: "Dominio GNAC (vincoli archeologici) non risolve via DNS: servizio non raggiungibile." } },
  { host: "sig.beniculturali.it", issue: { status: "offline", message: "Dominio sig.beniculturali.it non risolve via DNS: servizio non raggiungibile." } },
  { host: "www.webms.it", issue: { status: "offline", message: "Servizio webms.it (faglie) non disponibile: dominio non in allowlist." } },
  { host: "dati.protezionecivile.it", issue: { status: "offline", message: "Servizio DPC faglie non disponibile: endpoint dismesso." } },
  { host: "www.snam.it", issue: { status: "offline", message: "Servizio WMS/WFS SNAM non disponibile: non è un endpoint GIS pubblico." } },
  { host: "sgi2.isprambiente.it", issue: { status: "offline", message: "Servizio ITHACA (ISPRA) instabile: connessione rifiutata dal server remoto (Connection reset)." } },
  { host: "annuario.isprambiente.it", issue: { status: "tls_error", message: "Certificato TLS scaduto sul server annuario.isprambiente.it. Abilita bypass TLS per utilizzarlo." } },
  { host: "geoportale.enac.gov.it", issue: { status: "offline", message: "Dominio geoportale.enac.gov.it non risolve via DNS: servizio non raggiungibile." } },
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
  const host = getEndpointHost(url);
  const match = KNOWN_OFFLINE_HOSTS.find((entry) => entry.host === host);
  return match?.issue ?? null;
}