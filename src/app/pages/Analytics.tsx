import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Analytics() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <BarChart3 className="h-9 w-9 text-slate-700" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600 mt-1">Показатели и отчёты по работе медиаблока</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Скоро здесь</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            Раздел для отдела аналитики, общего руководства и сервисной учётной записи. Контент можно
            подключить позже (метрики задач, загрузка команды, дедлайны и т.д.).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
