declare module 'amadeus' {
  interface AmadeusConfig {
    clientId?: string;
    clientSecret?: string;
    hostname?: 'test' | 'production';
    logLevel?: string;
  }
  interface ScheduleFlightsGetParams {
    carrierCode: string;
    flightNumber: string;
    scheduledDepartureDate: string;
  }
  class Amadeus {
    constructor(config: AmadeusConfig);
    schedule: { flights: { get(params: ScheduleFlightsGetParams): Promise<{ data?: unknown[]; result?: { data?: unknown[] } }> } };
  }
  export = Amadeus;
}
