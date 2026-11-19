import {
  createTask, toggleTask, addTask, removeTask, findTask,
  countActive, summarizeTasks, loadTasks, scheduleAutosave,
} from "./todo";

describe("createTask", () => {
  test("создаёт активную задачу", () => {
    expect(createTask("Хлеб")).toEqual({ title: "Хлеб", done: false });
  });

  test.each([[""], [null], [undefined]])("отклоняет название %p", (title) => {
    expect(() => createTask(title)).toThrow("Название задачи обязательно");
  });
});

test.each([false, true])("toggleTask инвертирует done=%p в копии", (done) => {
  const task = Object.freeze({ title: "Хлеб", done });
  const result = toggleTask(task);

  expect(result).toEqual({ title: "Хлеб", done: !done });
  expect(result).not.toBe(task);
  expect(task).toEqual({ title: "Хлеб", done });
});

describe("операции со списком задач", () => {
  const bread = Object.freeze({ title: "Хлеб", done: false });
  const milk = Object.freeze({ title: "Молоко", done: true });
  const tasks = Object.freeze([bread, milk]);

  test("addTask добавляет задачу в новый массив", () => {
    const result = addTask(tasks, "Чай");

    expect(result).toEqual([bread, milk, { title: "Чай", done: false }]);
    expect(result).not.toBe(tasks);
    expect(tasks).toEqual([bread, milk]);
  });

  test("addTask отклоняет пустое название", () => {
    expect(() => addTask(tasks, "")).toThrow("Название задачи обязательно");
  });

  test("removeTask удаляет задачу из нового массива", () => {
    const result = removeTask(tasks, "Хлеб");

    expect(result).toEqual([milk]);
    expect(result).not.toBe(tasks);
    expect(tasks).toEqual([bread, milk]);
  });

  test("removeTask возвращает копию массива, если название не найдено", () => {
    const result = removeTask(tasks, "Чай");

    expect(result).toEqual(tasks);
    expect(result).not.toBe(tasks);
  });

  test("findTask возвращает найденную задачу или undefined", () => {
    expect(findTask(tasks, "Молоко")).toBe(milk);
    expect(findTask(tasks, "Чай")).toBeUndefined();
  });

  test("countActive считает невыполненные задачи", () => {
    expect(countActive(tasks)).toBe(1);
    expect(countActive([])).toBe(0);
  });

  test("summarizeTasks возвращает счётчики и названия в исходном порядке", () => {
    const summary = summarizeTasks(tasks);

    expect(summary).toEqual({
      total: 2,
      active: 1,
      done: 1,
      titles: ["Хлеб", "Молоко"],
    });
    expect(summary).toMatchSnapshot();
  });
});

describe("loadTasks", () => {
  test("вызывает API один раз и преобразует названия в задачи", async () => {
    const api = { fetchTitles: jest.fn().mockResolvedValue(["Хлеб", "Чай"]) };

    expect(await loadTasks(api)).toEqual([
      { title: "Хлеб", done: false },
      { title: "Чай", done: false },
    ]);
    expect(api.fetchTitles).toHaveBeenCalledTimes(1);
  });

  test("пробрасывает ошибку сети", async () => {
    const error = new Error("Сеть недоступна");
    const api = { fetchTitles: jest.fn().mockRejectedValue(error) };
    const result = loadTasks(api);

    await expect(result).rejects.toThrow("Сеть недоступна");
    await expect(result).rejects.toBe(error);
  });
});

describe("scheduleAutosave", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test.each([[[250], 250], [[], 1000]])(
    "сохраняет с аргументом задержки %p через %i мс",
    (delayArgs, delay) => {
      const storage = { save: jest.fn() };
      const tasks = [{ title: "Хлеб", done: false }];

      scheduleAutosave(storage, tasks, ...delayArgs);
      expect(storage.save).not.toHaveBeenCalled();

      jest.advanceTimersByTime(delay - 1);
      expect(storage.save).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(storage.save).toHaveBeenCalledWith(tasks);
      expect(storage.save).toHaveBeenCalledTimes(1);
    },
  );

  test("возвращает идентификатор для отмены сохранения", () => {
    const storage = { save: jest.fn() };
    const timer = scheduleAutosave(storage, []);

    clearTimeout(timer);
    jest.advanceTimersByTime(1000);
    expect(storage.save).not.toHaveBeenCalled();
  });
});
