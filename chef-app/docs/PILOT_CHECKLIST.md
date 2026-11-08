# Pilot Checklist — Toptan Gıda

## Week 1: Supplier Onboarding (Kill Switch: Catalog Import)
- [ ] Distributor signs LOI
- [ ] Excel catalog imported (50+ SKUs)
- [ ] Auto-invoice generation works
- [ ] Payment tracking works

**Kill Criteria**: If catalog import fails or < 50 SKUs → **KILL PROJECT**

## Week 2: Chef Onboarding & Core Flow
- [ ] 15 chefs linked via Telegram invite codes
- [ ] Cart works end-to-end (supplier tabs, product grid, price compare modal)
- [ ] Price compare shows multiple suppliers for same SKU
- [ ] Orders create invoices automatically

## Week 3: Revenue & Retention
- [ ] 2% platform fee collected on test orders
- [ ] Payout to distributor works (fee deducted correctly)
- [ ] Reorder templates used (quick reorder from history)
- [ ] Telegram notifications: order confirmed, invoice issued, payment reminders

## Week 4: Validation Metrics (Decision Point)
- [ ] Metric: % chefs with 2+ orders in Week 2 > 40%
- [ ] Metric: Average order value > ₼500
- [ ] Metric: Platform fee revenue > ₼3,000/month (15 restaurants × ₼500 × 4 weeks × 2%)
- [ ] **Decision: CONTINUE / PIVOT / KILL**

---

## Pilot Scripts

### 1. Onboard Distributor
```bash
cd chef-app
tsx scripts/onboard_distributor.ts catalog.xlsx "Ankara Gıda" "Mehmet Yılmaz" "+905551234567" "mehmet@ankaragida.com" "Ankara, Türkiye" "1234567890"
```

### 2. Onboard 15 Restaurants
```bash
tsx scripts/onboard_restaurants.ts <distributor_id> restaurants.csv
```
CSV format: `name,contact_name,phone,email,address,tax_number`

### 3. Daily Metrics
```bash
tsx scripts/daily_metrics.ts <distributor_id> [days]
# Default: last 7 days
```

---

## Expected Outcomes

| Metric | Target | Source |
|--------|--------|--------|
| SKUs imported | > 50 | Week 1 |
| Chefs onboarded | 15 | Week 2 |
| Week 2 repeat rate | > 40% | Week 4 |
| Avg order value | > ₼500 | Week 4 |
| Monthly platform fees | > ₼3,000 | Week 4 |

---

## Contact
- Founder: [Your Name]
- Telegram: @yourhandle
- Email: your@email.com