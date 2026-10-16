# Florărie — POS web

Aplicație locală pentru vânzător: catalog buchete cu preț, detalii de realizare, coș și factură printabilă (doar denumire + preț).

## Pornire

```bash
npm install
npm run dev
```

Deschide URL-ul afișat în terminal (de obicei `http://localhost:5173`).

## Funcții

- **Vânzare** — vezi buchetele și prețurile; la click apar ingredientele și pașii de realizare; adaugi în coș și finalizezi comanda
- **Factură** — tipărire din browser (poți salva ca PDF); pe factură apar doar denumirea și prețul
- **Admin catalog** — adaugă / editează / șterge buchete; la prima rulare se încarcă buchete exemplu

Datele se salvează în `localStorage` pe calculatorul curent.
