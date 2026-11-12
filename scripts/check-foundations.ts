import assert from "node:assert/strict";
import {
  classify, formatBigMoney, formatTaxPeriod, parseBmfCsv, splitCsvLine, titleCase, bmfUrlForState,
} from "@/lib/foundations/bmf";

// CSV splitting
assert.deepEqual(splitCsvLine('a,b,,d'), ["a", "b", "", "d"]);
assert.deepEqual(splitCsvLine('1,"SMITH, JOHN & ""JR"" FDN",x'), ["1", 'SMITH, JOHN & "JR" FDN', "x"]);

// classification
assert.equal(classify("04", null), "PRIVATE_FOUNDATION");
assert.equal(classify("03", "T23"), "PRIVATE_OPERATING");
assert.equal(classify("15", "T31Z"), "COMMUNITY_FOUNDATION");
assert.equal(classify("15", "T700"), "GRANTMAKING_CHARITY");
assert.equal(classify("15", "B82"), null, "an ordinary public charity is not a funder");
assert.equal(classify("10", null), null, "churches are not funders");

// names
assert.equal(titleCase("LILLY ENDOWMENT INC"), "Lilly Endowment Inc");
assert.equal(titleCase("COMMUNITY FOUNDATION OF ST JOSEPH COUNTY INC"), "Community Foundation of St Joseph County Inc");
assert.equal(titleCase("NINA MASON PULLIAM CHARITABLE TR"), "Nina Mason Pulliam Charitable Trust");
assert.equal(titleCase("O'NEIL-SMITH FAMILY FDN"), "O'Neil-Smith Family Foundation");

const HEADER = "EIN,NAME,ICO,STREET,CITY,STATE,ZIP,GROUP,SUBSECTION,AFFILIATION,CLASSIFICATION,RULING,DEDUCTIBILITY,FOUNDATION,ACTIVITY,ORGANIZATION,STATUS,TAX_PERIOD,ASSET_CD,INCOME_CD,FILING_REQ_CD,PF_FILING_REQ_CD,ACCT_PD,ASSET_AMT,INCOME_AMT,REVENUE_AMT,NTEE_CD,SORT_NAME";
const csv = [
  HEADER,
  "350868122,LILLY ENDOWMENT INC,,PO BOX 88068,INDIANAPOLIS,IN,46208-0068,0000,03,3,1000,193807,1,04,602922000,1,01,202512,9,9,00,1,12,105894116636,5126341657,,,",
  "351111111,CENTRAL INDIANA COMMUNITY FOUNDATION INC,% JANE DOE,615 N ALABAMA ST,INDIANAPOLIS,IN,46204-0000,0000,03,3,1000,199701,1,15,000000000,1,01,202412,9,9,01,0,12,583467973,90000000,85000000,T31,",
  "352222222,SOME CHURCH,,1 MAIN ST,MUNCIE,IN,47302-0000,0000,03,3,1000,195001,1,10,000000000,1,01,,0,0,06,0,12,,,,,",
  "353333333,REVOKED FAMILY FOUNDATION,,2 MAIN ST,GARY,IN,46402-0000,0000,03,3,1000,200001,1,04,000000000,1,20,202212,3,3,00,1,12,150000,-2000,,T22,",
  "35444,BAD EIN FOUNDATION,,3 MAIN ST,GARY,IN,46402-0000,0000,03,3,1000,200001,1,04,000000000,1,01,202212,3,3,00,1,12,150000,2000,,T22,",
  "",
].join("\r\n");

const { totalRows, records } = parseBmfCsv(csv);
assert.equal(totalRows, 5);
assert.equal(records.length, 2, "church, revoked status, and malformed EIN are skipped");

const lilly = records[0];
assert.equal(lilly.ein, "350868122");
assert.equal(lilly.kind, "PRIVATE_FOUNDATION");
assert.equal(lilly.assets, BigInt("105894116636"), "amounts above 2^31 survive intact");
assert.equal(lilly.revenue, null);
assert.equal(lilly.rulingYear, 1938);
assert.equal(lilly.taxPeriod, "202512");
assert.equal(lilly.zip, "46208-0068");
assert.equal(lilly.nteeCode, null);

const cicf = records[1];
assert.equal(cicf.kind, "COMMUNITY_FOUNDATION");
assert.equal(cicf.careOf, "Jane Doe");
assert.equal(cicf.zip, "46204", "placeholder -0000 zip suffix is dropped");

// layout change fails loudly
assert.throws(() => parseBmfCsv("EIN,NAME,CITY\n1,2,3"), /layout changed/);

// formatting
assert.equal(formatBigMoney(BigInt("105894116636")), "$105.9B");
assert.equal(formatBigMoney(BigInt("2400000")), "$2.4M");
assert.equal(formatBigMoney(BigInt("85000")), "$85K");
assert.equal(formatBigMoney(-BigInt("2000")), "-$2K");
assert.equal(formatBigMoney(null), "Not reported");
assert.equal(formatTaxPeriod("202412"), "Dec 2024");
assert.equal(formatTaxPeriod(null), null);
assert.equal(bmfUrlForState("IN"), "https://www.irs.gov/pub/irs-soi/eo_in.csv");

console.log("check-foundations: all assertions passed");
