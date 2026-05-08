# Role-Based Access Control

```
Version 1
05-08-2926
```

## CRUD

- C = Create
- R = Read
- U = Update/Edit
- D = Delete

| Role                   | Users | Clients | Consultations | Notary | Cases | Tasks       | Payments | Documents       | Notes       |
| ---------------------- | ----- | ------- | ------------- | ------ | ----- | ----------- | -------- | --------------- | ----------- |
| Super Admin            | CRUD  | CRUD    | CRUD          | CRUD   | CRUD  | CRUD        | CRUD     | CRUD            | CRUD        |
| Admin / Branch Manager | CRU   | CRUD    | CRUD          | CRUD   | CRUD  | CRUD        | CRUD     | CRUD            | CRUD        |
| Lawyer                 | R / U | CRUD    | CRUD          | CRUD   | CRUD  | CRUD        | CRUD     | CRUD            | CRUD        |
| Paralegal              | R     | R       | R             | R      | R     | R / U tasks | R        | R / U task docs | R / U notes |
| Process Server         | R     | R       | R             | R      | R     | R / U tasks | R        | R / U task docs | R / U notes |
