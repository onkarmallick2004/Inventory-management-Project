# ER diagram

Source of truth: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).
GitHub renders the diagram below automatically.

```mermaid
erDiagram
    CUSTOMER ||--o{ MACHINE : owns
    CUSTOMER ||--o{ USER : "has portal logins"
    CUSTOMER ||--o{ SERVICE_REQUEST : raises
    PRODUCT ||--o{ MACHINE : "is the model of"
    PRODUCT }o--o{ PART : "compatible with"
    MACHINE ||--o{ SERVICE_JOB : "is serviced by"
    MACHINE ||--o{ SERVICE_REQUEST : "is subject of"
    MACHINE ||--o{ NOTIFICATION : "triggers"
    USER ||--o{ SERVICE_JOB : "technician for"
    USER ||--o{ SERVICE_REQUEST : "raised by"
    USER ||--o{ STOCK_MOVEMENT : "recorded by"
    SERVICE_REQUEST ||--o| SERVICE_JOB : "becomes"
    SERVICE_JOB ||--o{ PART_USED : uses
    PART ||--o{ PART_USED : "is used in"
    PART ||--o{ STOCK_MOVEMENT : "stock history"
    PART ||--o{ NOTIFICATION : "low-stock alert"
    SERVICE_JOB ||--o{ STOCK_MOVEMENT : "consumes"

    USER {
        int id PK
        string email UK
        string passwordHash
        string role "ADMIN | TECHNICIAN | CUSTOMER"
        int customerId FK "only for CUSTOMER"
        boolean isActive
    }
    CUSTOMER {
        int id PK
        string companyName
        string contactPerson
        string email UK
        string phone
        string city
        string gstNumber
    }
    PRODUCT {
        int id PK
        string modelName UK
        string category "AIR_COMPRESSOR | VACUUM_PUMP"
        string type "SCREW | PISTON | ROTARY_VANE | SCROLL | LIQUID_RING"
        float airflowCfm
        float airflowLpm
        float pressureBar
        float powerKw
        string phase "SINGLE | THREE"
        string applications "comma-separated tags"
        float price
    }
    MACHINE {
        int id PK
        string serialNumber UK
        int productId FK
        int customerId FK
        date installDate
        date warrantyEnd
        date amcStart
        date amcEnd
        int serviceIntervalDays
        date nextServiceDue
        string qrToken UK
    }
    SERVICE_JOB {
        int id PK
        int machineId FK
        int technicianId FK
        int serviceRequestId FK,UK
        string type "INSTALLATION | ROUTINE | BREAKDOWN"
        string status "OPEN | IN_PROGRESS | CLOSED"
        date scheduledDate
        date closedDate
        string notes
    }
    PART {
        int id PK
        string partNumber UK
        string name
        int stockQty "never below 0"
        int minimumLevel
        float unitPrice
    }
    PART_USED {
        int id PK
        int jobId FK
        int partId FK
        int quantity "> 0, unique (jobId, partId)"
    }
    SERVICE_REQUEST {
        int id PK
        int machineId FK
        int customerId FK
        int raisedById FK "null when raised from the QR page"
        string description
        string status "NEW | ASSIGNED | RESOLVED | CANCELLED"
    }
    NOTIFICATION {
        int id PK
        string type "SERVICE_DUE | AMC_EXPIRING | WARRANTY_EXPIRING | LOW_STOCK"
        int machineId FK
        int partId FK
        date dueDate "unique (type, machineId, dueDate)"
        boolean emailSent
        boolean isRead
    }
    STOCK_MOVEMENT {
        int id PK
        int partId FK
        int change "+ in, - out"
        string reason "RESTOCK | JOB_CONSUMPTION | ADJUSTMENT"
        int jobId FK
        int userId FK
    }
```

## Constraints worth mentioning in the viva

| Rule | Where it is enforced |
|---|---|
| Unique serial number, part number, model name, emails, QR token | Database unique indexes |
| A part appears once per job | Unique `(jobId, partId)` on PartUsed |
| A request creates at most one job | Unique `serviceRequestId` on ServiceJob |
| No duplicate reminders | Unique `(type, machineId, dueDate)` on Notification |
| A customer with machines, or a machine with jobs, can't be deleted | Foreign keys (`Restrict`), API returns 409 |
| Stock never goes negative | Job close runs in a transaction and decrements only `where stockQty >= quantity` |
| Allowed values for role / status / type | Zod validators using `src/config/constants.js` (kept as strings so the same schema runs on SQLite and PostgreSQL) |
| Stock changes are traceable | Every change writes a StockMovement; their sum equals `stockQty` (tested) |
