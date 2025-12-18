const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK = process.env.REACT_APP_USE_MOCK_API === 'true' || !process.env.REACT_APP_API_URL;

const mockTemplates = [
  {
    _id: '1',
    name: 'Rental Agreement',
    description: 'Standard office rental agreement',
    category: 'legal',
    department: 'legal',
    tags: ['rental', 'legal', 'agreement'],
    file: {
      originalName: 'rental-agreement.docx',
      storedName: 'file_12345.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 24576,
      url: '/files/rental-agreement.docx'
    },
    content: `# ДОГОВОР АРЕНДЫ ОФИСНОГО ПОМЕЩЕНИЯ № 001/24

г. Москва                                  15 января 2024 года

ООО "АРЕНДОДАТЕЛЬ", именуемое в дальнейшем "Арендодатель", в лице генерального директора Иванова И.И., действующего на основании Устава, с одной стороны, и ООО "АРЕНДАТОР", именуемое в дальнейшем "Арендатор", в лице генерального директора Петрова П.П., действующего на основании Устава, с другой стороны, совместно именуемые "Стороны", заключили настоящий Договор о нижеследующем:

## 1. ПРЕДМЕТ ДОГОВОРА
1.1. Арендодатель предоставляет, а Арендатор принимает в аренду офисное помещение общей площадью 50 (пятьдесят) кв. м, расположенное по адресу: г. Москва, ул. Примерная, д. 10, офис 505, для использования в целях размещения офиса и осуществления предпринимательской деятельности.

## 2. СРОК АРЕНДЫ
2.1. Настоящий Договор заключен на срок с 01 февраля 2024 года по 31 января 2025 года.

## 3. АРЕНДНАЯ ПЛАТА
3.1. Размер арендной платы составляет 50 000 (пятьдесят тысяч) рублей в месяц, включая НДС.
3.2. Арендная плата вносится Арендатором не позднее 10-го числа каждого месяца.
3.3. В случае просрочки платежа Арендатор уплачивает пеню в размере 0,1% от суммы просроченного платежа за каждый день просрочки.

## 4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
4.1. Арендатор обязан:
   - Использовать помещение строго по назначению;
   - Своевременно вносить арендную плату;
   - Соблюдать правила пожарной безопасности;
   - Обеспечивать сохранность имущества.

4.2. Арендодатель обязан:
   - Предоставить помещение в надлежащем состоянии;
   - Обеспечить коммунальные услуги;
   - Проводить капитальный ремонт при необходимости.

## 5. РАСТОРЖЕНИЕ ДОГОВОРА
5.1. Договор может быть расторгнут по соглашению Сторон.
5.2. Арендодатель вправе расторгнуть Договор в одностороннем порядке в случае неуплаты арендной платы более 30 дней.
5.3. Арендатор вправе расторгнуть Договор, предупредив Арендодателя за 1 месяц.

## 6. ПРОЧИЕ УСЛОВИЯ
6.1. Все споры решаются путем переговоров.
6.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу.

ПОДПИСИ СТОРОН:

Арендодатель: _______________ /Иванов И.И./
Арендатор:   _______________ /Петров П.П./`,
    previousContent: `# ДОГОВОР АРЕНДЫ ОФИСНОГО ПОМЕЩЕНИЯ № 001/24

г. Москва                                  10 января 2024 года

ООО "АРЕНДОДАТЕЛЬ", именуемое в дальнейшем "Арендодатель", в лице генерального директора Иванова И.И., действующего на основании Устава, с одной стороны, и ООО "АРЕНДАТОР", именуемое в дальнейшем "Арендатор", в лице генерального директора Петрова П.П., действующего на основании Устава, с другой стороны, совместно именуемые "Стороны", заключили настоящий Договор о нижеследующем:

## 1. ПРЕДМЕТ ДОГОВОРА
1.1. Арендодатель предоставляет, а Арендатор принимает в аренду офисное помещение общей площадью 50 (пятьдесят) кв. м, расположенное по адресу: г. Москва, ул. Примерная, д. 10, офис 505.

## 2. СРОК АРЕНДЫ
2.1. Настоящий Договор заключен на срок с 01 февраля 2024 года по 31 декабря 2024 года.

## 3. АРЕНДНАЯ ПЛАТА
3.1. Размер арендной платы составляет 45 000 (сорок пять тысяч) рублей в месяц, включая НДС.
3.2. Арендная плата вносится Арендатором не позднее 15-го числа каждого месяца.

## 4. ПРАВА И ОБЯЗАННОСТИ СТОРОН
4.1. Арендатор обязан:
   - Использовать помещение по назначению;
   - Вносить арендную плату.

4.2. Арендодатель обязан:
   - Предоставить помещение;
   - Обеспечить коммунальные услуги.

## 5. РАСТОРЖЕНИЕ ДОГОВОРА
5.1. Договор может быть расторгнут по соглашению Сторон.

## 6. ПРОЧИЕ УСЛОВИЯ
6.1. Все споры решаются путем переговоров.

ПОДПИСИ СТОРОН:

Арендодатель: _______________ /Иванов И.И./
Арендатор:   _______________ /Петров П.П./`,
    metadata: {
      author: 'Ivanov I.I.',
      version: 1.2,
      status: 'approved',
      lastModified: '2024-01-15T10:00:00Z',
      checksum: 'abc123def456'
    },
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    _id: '2',
    name: 'Vacation Request',
    description: 'Standard annual vacation request form',
    category: 'hr',
    department: 'hr',
    tags: ['vacation', 'hr', 'request'],
    file: {
      originalName: 'vacation-request.pdf',
      storedName: 'file_12346.pdf',
      mimeType: 'application/pdf',
      size: 15360,
      url: '/files/vacation-request.pdf'
    },
    content: `# ЗАЯВЛЕНИЕ НА ОТПУСК

Дата: 20 января 2024 г.
Табельный номер: 12345
ФИО сотрудника: Петрова Анна Сергеевна
Должность: Менеджер по продажам
Отдел: Отдел продаж

## ПРОШУ ПРЕДОСТАВИТЬ МНЕ ЕЖЕГОДНЫЙ ОПЛАЧИВАЕМЫЙ ОТПУСК
Период отпуска: с 01 февраля 2024 г. по 14 февраля 2024 г.
Общая продолжительность: 14 календарных дней.

## РАСЧЕТ ОТПУСКНЫХ:
Стаж работы в компании: 2 года 3 месяца
Количество дней отпуска: 28 дней в год
Неиспользованные дни: 18 дней
Используемые дни: 14 дней
Оставшиеся дни: 4 дня

## КОММЕНТАРИИ:
Отпуск связан с семейными обстоятельствами.
Замещение на период отпуска: Сидоров А.А.

## СОГЛАСОВАНИЕ:
Непосредственный руководитель: _______________ /Иванов И.И./
Начальник отдела кадров: _______________ /Смирнова О.П./
Генеральный директор: _______________ /Васильев В.В./`,
    previousContent: `# ЗАЯВЛЕНИЕ НА ОТПУСК

Дата: 18 января 2024 г.
Табельный номер: 12345
ФИО сотрудника: Петрова Анна Сергеевна
Должность: Менеджер по продажам
Отдел: Отдел продаж

## ПРОШУ ПРЕДОСТАВИТЬ МНЕ ОТПУСК
Период отпуска: с 01 февраля 2024 г. по 10 февраля 2024 г.
Продолжительность: 10 дней.

## КОММЕНТАРИИ:
Замещение на период отпуска: Сидоров А.А.

## СОГЛАСОВАНИЕ:
Руководитель: _______________ /Иванов И.И./`,
    metadata: {
      author: 'Petrova A.S.',
      version: 2.0,
      status: 'draft',
      lastModified: '2024-01-20T14:30:00Z',
      checksum: 'ghi789jkl012'
    },
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  }
];

// Простой API сервис
const ApiService = {
  delay: (ms = 500) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // ========== TEMPLATES ==========
  async getTemplates(page = 1, limit = 10, filters = {}) {
    await this.delay(300);
    console.log('API: getTemplates', { page, limit, filters });
    
    let filtered = [...mockTemplates];
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    
    if (filters.department) {
      filtered = filtered.filter(t => t.department === filters.department);
    }
    
    if (filters.status) {
      filtered = filtered.filter(t => t.metadata.status === filters.status);
    }
    
    const start = (page - 1) * limit;
    const end = start + limit;
    
    return {
      templates: filtered.slice(start, end),
      totalCount: filtered.length,
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit)
    };
  },
  
  async getTemplate(id) {
    await this.delay(200);
    console.log('API: getTemplate', id);
    
    const template = mockTemplates.find(t => t._id === id);
    if (!template) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    return template;
  },
  
  async createTemplate(templateData) {
  await this.delay(800);
  console.log('API: createTemplate', templateData);
  
  
  const hasContent = templateData.content && templateData.content.length > 0;
  const isWordContent = templateData.content?.includes('[Word document');
  
  const newTemplate = {
    _id: Date.now().toString(),
    name: templateData.name || 'New Template',
    description: templateData.description || '',
    category: templateData.category || 'other',
    department: templateData.department || 'management',
    tags: templateData.tags || [],
    content: templateData.content || '', // Сохраняем контент
    previousContent: '', // Пусто для нового шаблона
    file: {
      originalName: hasContent 
        ? (isWordContent ? `${templateData.name || 'template'}.docx` : `${templateData.name || 'template'}.txt`)
        : 'new-file.docx',
      storedName: 'file_' + Date.now() + (isWordContent ? '.docx' : '.txt'),
      mimeType: isWordContent 
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/plain',
      size: templateData.content ? templateData.content.length * 2 : 10240,
      url: '/files/new-file'
    },
    metadata: {
      author: 'Current User',
      version: 1.0,
      status: 'draft',
      lastModified: new Date().toISOString(),
      checksum: 'mock_' + Date.now()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockTemplates.push(newTemplate);
  return newTemplate;
},

async updateTemplate(id, templateData) {
  await this.delay(700);
  console.log('API: updateTemplate', { id, templateData });
  
  const index = mockTemplates.findIndex(t => t._id === id);
  if (index === -1) {
    throw new Error(`Template with ID ${id} not found`);
  }
  
  // Сохраняем предыдущий контент перед обновлением
  const previousContent = mockTemplates[index].content;
  
  const updatedTemplate = {
    ...mockTemplates[index],
    ...templateData,
    previousContent: previousContent, // Сохраняем старый контент
    metadata: {
      ...mockTemplates[index].metadata,
      version: mockTemplates[index].metadata.version + 0.1,
      lastModified: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
  
  mockTemplates[index] = updatedTemplate;
  return updatedTemplate;
},
  
  async deleteTemplate(id) {
    await this.delay(600);
    console.log('API: deleteTemplate', id);
    
    const index = mockTemplates.findIndex(t => t._id === id);
    if (index === -1) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    mockTemplates.splice(index, 1);
    return { success: true, message: 'Template deleted' };
  },
  
  // ========== VERSIONS ==========
  async getTemplateVersions(templateId) {
    await this.delay(300);
    console.log('API: getTemplateVersions', templateId);
    
    // Mock версии
    return [
      {
        _id: 'v1',
        templateId: templateId,
        versionNumber: 1.0,
        changeDescription: 'Initial version',
        createdAt: '2024-01-10T09:00:00Z'
      },
      {
        _id: 'v2',
        templateId: templateId,
        versionNumber: 1.1,
        changeDescription: 'Updated formatting',
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];
  },
  
  async compareVersions(version1Id, version2Id) {
    await this.delay(400);
    console.log('API: compareVersions', { version1Id, version2Id });
    
    return {
      version1: { _id: version1Id, versionNumber: 1.0 },
      version2: { _id: version2Id, versionNumber: 1.1 },
      differences: [
        'Changed clause about rental period',
        'Added utility payment terms',
        'Updated contact information'
      ]
    };
  }
};

export default ApiService;
