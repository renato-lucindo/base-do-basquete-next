import { test, expect } from "@playwright/test";
import { playerPublicFixture } from "./fixtures/player-public-browser";
test("perfil abre sem sessão, navega pelas cinco seções por teclado e recupera URL", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url);
  await expect(
    page.getByRole("heading", { name: "Ana Pública", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("180 cm", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Seções do perfil" });
  for (const name of [
    "Estatísticas",
    "Conquistas e honrarias",
    "Jogos",
    "Histórico",
    "Resumo",
  ]) {
    await nav.getByRole("link", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeFocused();
  }
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Histórico", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Histórico", exact: true }),
  ).toBeVisible();
  expect(f.state.sessionReads).toBe(0);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
});
test("jogos e histórico têm páginas independentes e preservam totais", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { long: true });
  await page.goto(f.url + "?secao=historico&historyPage=2&mode=total");
  const h = page.getByRole("table", {
    name: "Inscrições em participações confirmadas",
    exact: true,
  });
  await expect(h.getByRole("row")).toHaveCount(6);
  await expect(
    page.getByText("Página 2 de 2 · 25 inscrições", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  const g = page.getByRole("table", { name: "Jogos confirmados", exact: true });
  await expect(g.getByRole("row")).toHaveCount(21);
  await page
    .getByRole("button", { name: "Próxima página de jogos", exact: true })
    .click();
  await expect(g.getByRole("row")).toHaveCount(6);
  await expect(page).toHaveURL(/historyPage=2/);
  await page.getByRole("link", { name: "Resumo", exact: true }).click();
  await expect(
    page.getByText("25 jogos disputados", { exact: true }),
  ).toBeVisible();
});
test("recortes e fases não inventam números; conquistas distinguem equipe e destinatário", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  await page.goto(f.url + "?secao=conquistas");
  await expect(page.getByText("MVP da edição", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/não atribui premiação individual/i),
  ).toBeVisible();
  await page.getByRole("link", { name: "Estatísticas", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("regular");
  await expect(
    page.getByText(
      "Nenhum jogo disputado com dados confirmados neste recorte.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Escopo", exact: true })
    .selectOption("all");
  await expect(
    page.getByRole("table", { name: "Estatísticas da carreira", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Disputa", exact: true })
    .selectOption(f.source.participations[0].fact.disputeId);
  await expect(page).toHaveURL(
    new RegExp("disputeId=" + f.source.participations[0].fact.disputeId),
  );
  await expect(
    page.getByRole("heading", { name: "Estatísticas", exact: true }),
  ).toBeFocused();
});
test("perfil sem jogos preserva vazios e somente metadados publicados", async ({
  page,
}) => {
  const f = await playerPublicFixture(page, { profileOnly: true });
  await page.goto(f.url);
  await expect(
    page.getByText("Ainda não há jogos confirmados neste recorte.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Trajetória confirmada.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ano de nascimento", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Estatísticas", exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("erro e contaminação não exibem fonte, retry e resposta atrasada respeitam URL atual", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  f.state.missing = true;
  await page.goto(f.url);
  await expect(page.getByRole("alert")).toContainText("Perfil não publicado");
  f.state.missing = false;
  f.state.corrupt = true;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await expect(page.getByText("do-not-display")).toHaveCount(0);
  f.state.corrupt = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resumo", exact: true }),
  ).toBeVisible();
  f.state.delayNext = 300;
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  await page.getByRole("link", { name: "Histórico", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Histórico", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(350);
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toHaveCount(0);
});
test("320px, tabela rolável e pular conteúdo preservam identidade na URL", async ({
  page,
}, info) => {
  const f = await playerPublicFixture(page);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto(f.url + "?secao=estatisticas");
  await expect(
    page.getByRole("table", { name: "Estatísticas da carreira", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Pular para o perfil", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(f.source.personId + ".*secao=estatisticas"),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/player-public-320-${info.project.name}.png`,
    fullPage: true,
  });
});

test("relacionado sem jogar não recebe zero estatístico e mantém camisa da ocasião", async ({
  page,
}) => {
  const f = await playerPublicFixture(page);
  for (const p of f.source.participations)
    Object.assign(p.fact, {
      played: false,
      starter: false,
      captain: false,
      scoring: null,
      advanced: null,
      foulsCommitted: null,
      foulsReceived: null,
      discipline: null,
    });
  await page.goto(f.url);
  await expect(
    page.getByText(
      "Nenhum jogo disputado neste recorte; há participações relacionadas.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Não participou", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("cell", { name: "Outra inscrição · #77", exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "0", exact: true })).toHaveCount(
    0,
  );
});
