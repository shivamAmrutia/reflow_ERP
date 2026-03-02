// Raw ERP document format.

export type RawDocument = {
    docId: string;
    docType: string;
    data: any;
};

export type RawWorkOrder = RawDocument & {
    docType: "workOrder";
};

export type RawWorkCenter = RawDocument & {
    docType: "workCenter";
};

export type RawManufacturingOrder = RawDocument & {
    docType: "manufacturingOrder";
};

export type TimeWindow = {
    start: Date;
    end: Date;
};

export type Shift = {
    dayOfWeek: number; // 0-6
    startHour: number;
    endHour: number;
};

export type WorkCenter = {
    id: string;
    name: string;
    shifts: Shift[];
    maintenanceWindows: TimeWindow[];
};

export type WorkOrder = {
    id: string;
    workOrderNumber: string;
    manufacturingOrderId: string;
    workCenterId: string;

    start: Date;
    end: Date;
    durationMinutes: number;

    isMaintenance: boolean;
    dependsOn: string[];
};

export type ScheduledBlock = {
    workOrderId: string;
    start: Date;
    end: Date;
};

export type ScheduleChange = {
    workOrderId: string;
    oldStart: Date;
    newStart: Date;
    reason: string;
};

export type ReflowResult = {
    schedule: WorkOrder[];
    changes: ScheduleChange[];
};