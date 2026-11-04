import { Component, effect, ElementRef, input, OnDestroy, viewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Chart, registerables } from 'chart.js';
import { Seleccion } from '../../interface/seleccion';

// REGISTRA TODOS LOS TIPOS DE GRÁFICA Y COMPONENTES DE CHART.JS DE UNA VEZ.
Chart.register(...registerables);

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.scss']
})
export class GraficosComponent implements OnDestroy {
  // INPUT<T>() RECIBE DATOS DEL COMPONENTE PADRE MEDIANTE UN SIGNAL.
  // EL PADRE LO USA ASÍ: <APP-GRAFICOS [SELECCIONES]="SELECCION">
  selecciones = input<Seleccion[]>([]);

  // VIEWCHILD APUNTA AL <CANVAS #CANVASGOLES> DEL TEMPLATE.
  // ES UNDEFINED HASTA QUE ANGULAR CONSTRUYE LA VISTA.
  private readonly canvasGoles = viewChild<ElementRef<HTMLCanvasElement>>('canvasGoles');

  // GUARDA LA INSTANCIA DE CHART PARA DESTRUIRLA ANTES DE REDIBUJAR.
  // SIN ESTO CHART.JS LANZARÍA EL ERROR "CANVAS IS ALREADY IN USE".
  // EN ESTE EJEMPLO, SOLO TENDREMOS UN ÚNICO CHART 'GOLES', PERO USAR UN MAP CON CLAVES DESCRIPTIVAS ES BUENA PRÁCTICA CUANDO EL COMPONENTE PUEDE CRECER CON MÁS GRÁFICAS EN EL FUTURO.
  private charts = new Map<string, Chart>();

  constructor() {
    // EFFECT() SE RE-EJECUTA AUTOMÁTICAMENTE CADA VEZ QUE CAMBIA SELECCIONES()
    // O CANVASGOLES(). SI EL CANVAS AÚN NO EXISTE, EL GUARD EVITA DIBUJAR;
    // EL EFFECT VOLVERÁ A EJECUTARSE CUANDO ANGULAR CONSTRUYA LA VISTA.
    effect(() => {
      const selecciones = this.selecciones();
      const canvas = this.canvasGoles()?.nativeElement;

      if (!canvas || selecciones.length === 0) {
        this.destroyChart('goles');
        return;
      }

      this.renderGoles(selecciones, canvas);
    });
  }

  // DESTRUYE LA INSTANCIA ANTERIOR PARA LIBERAR EL CANVAS ANTES DE REDIBUJAR.
  private destroyChart(key: string): void {
    this.charts.get(key)?.destroy();
    this.charts.delete(key);
  }

  // GRÁFICO DE BARRAS VERTICALES: GOLES POR SELECCIÓN EN LA UEFA EURO 2024.
  // LOS DATOS SE ORDENAN DE MAYOR A MENOR ANTES DE DIBUJAR.
  // LA PALETA DE COLORES SE REPITE SI HAY MÁS BARRAS QUE COLORES.
  // EL SUFIJO 'BB' EN HEX EQUIVALE A ~73 % DE OPACIDAD (RELLENO SEMITRANSPARENTE).
  private renderGoles(seleccion: Seleccion[], canvas: HTMLCanvasElement): void {
    this.destroyChart('goles');

    // SORT MODIFICA EL ARRAY ORIGINAL, POR ESO ORDENAMOS UNA COPIA.
    const sorted: Seleccion[] = [...seleccion].sort((a, b) => b.goles - a.goles);
    const colors = ['#3880ff', '#2dd36f', '#eb445a', '#ffc409', '#5260ff',
      '#0cd1e8', '#f7a34b', '#a855f7', '#10dc60', '#92949c'];

    this.charts.set('goles', new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(seleccion => seleccion.seleccion),
        datasets: [{
          label: 'Goles marcados',
          data: sorted.map(seleccion => seleccion.goles),
          backgroundColor: sorted.map((_, index) =>
            `${colors[index % colors.length]}bb`
          ),
          borderColor: sorted.map((_, index) => colors[index % colors.length]),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        // LA GRÁFICA SE REDIMENSIONA CON EL CONTENEDOR Y SU ALTURA SE CONTROLA DESDE CSS.
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Goles marcados por selección en la Eurocopa 2024'
          },
          tooltip: {
            callbacks: {
              label: context => {
                const seleccion = sorted[context.dataIndex];
                return `Goles: ${seleccion.goles} | Partidos: ${seleccion.partidos}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Goles'
            },
            ticks: { stepSize: 1 },
            grid: { color: 'rgba(0, 0, 0, 0.06)' }
          },
          x: {
            title: {
              display: true,
              text: 'Selección'
            },
            ticks: { maxRotation: 45 },
            grid: { display: false }
          }
        }
      }
    }));
  }

  // ANGULAR LLAMA A NGONDESTROY ANTES DE DESTRUIR EL COMPONENTE.
  // DESTRUIMOS TODAS LAS INSTANCIAS DE CHART PARA LIBERAR MEMORIA Y
  // EVITAR MEMORY LEAKS SI EL USUARIO NAVEGA VARIAS VECES.
  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }
}
