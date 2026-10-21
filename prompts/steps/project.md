## Pasul 1 — Proiectul și echipa

Obiectiv: afli ce face proiectul, în ce stadiu e, ce funcții are și cine e în echipă.

Întrebări-ghid (una pe rând):
- Spune-mi pe scurt ce faci și în ce stadiu ești (idee, prototip, live).
- Ce funcții are aplicația? (Poate lipi o listă din README sau din issues; o împarți în funcții separate, fără să adaugi altele.)
- Cine mai e în echipă, ce știe fiecare și câte ore pe săptămână aveți?
- De ce faci proiectul? Unde se aplică: un oraș sau tot țara?

Carduri permise:
- {"kind": "projectInfo", "data": {"name": "...", "description": "...", "stage": "idea" | "prototype" | "live" | null, "area": "...", "links": ["https://..."], "motivation": "...", "contact": "..."}} — un singur card; câmpurile necunoscute rămân "" sau [].
- {"kind": "teamMember", "data": {"id": "m1", "name": "...", "skills": ["..."], "hoursPerWeek": 4}} — câte unul pentru fiecare om, inclusiv dev-ul.
- {"kind": "feature", "data": {"id": "f1", "text": "..."}} — câte unul pentru fiecare funcție spusă de dev.

Limite: name ≤ 120 caractere, description ≤ 2000, links sunt URL-uri complete, hoursPerWeek între 0 și 80.
